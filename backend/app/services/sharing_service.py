from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import urllib.parse

from app.schemas.sharing import (
    ShareCreateRequest,
    ShareResponse,
    SharedItemResponse,
    SharePermission,
    ResourceType,
)
from app.schemas.file import FileAssetResponse
from app.storage.gridfs import GridFSStorage
from app.services.audit_service import log_audit_event

logger = logging.getLogger("ownly.services.sharing")


async def create_share(
    db: AsyncIOMotorDatabase,
    user_id: str,
    req: ShareCreateRequest,
) -> ShareResponse:
    if not ObjectId.is_valid(req.resourceId):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid resource ID")

    resource_oid = ObjectId(req.resourceId)
    user_oid = ObjectId(user_id)

    # 1. Verify resource exists and belongs to current user
    resource_title = "Shared Resource"
    if req.resourceType == "item":
        item = await db["items"].find_one({
            "_id": resource_oid,
            "ownerId": user_oid,
            "deletedAt": None,
        })
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found in your vault",
            )
        resource_title = item.get("title", "Untitled Item")
    elif req.resourceType == "album":
        album = await db["albums"].find_one({
            "_id": resource_oid,
            "ownerId": user_oid,
        })
        if not album:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Album not found in your vault",
            )
        resource_title = album.get("title", "Untitled Album")
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported resource type")

    # 2. Look up recipient by email
    recipient_email = req.recipientEmail.lower().strip()
    recipient_user = await db["users"].find_one({"email": recipient_email})
    if not recipient_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email '{recipient_email}'",
        )

    recipient_oid = recipient_user["_id"]
    if recipient_oid == user_oid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot share resources with yourself",
        )

    now = datetime.now(timezone.utc)

    # 3. Check for existing active share grant
    existing_share = await db["shares"].find_one({
        "ownerId": user_oid,
        "resourceType": req.resourceType,
        "resourceId": resource_oid,
        "recipientUserId": recipient_oid,
        "revokedAt": None,
    })

    if existing_share:
        # Update existing share with new permissions or expiry
        await db["shares"].update_one(
            {"_id": existing_share["_id"]},
            {
                "$set": {
                    "permissions": req.permissions,
                    "expiresAt": req.expiresAt,
                    "updatedAt": now,
                }
            },
        )
        share_id = existing_share["_id"]
    else:
        # Create new share
        share_doc = {
            "ownerId": user_oid,
            "resourceType": req.resourceType,
            "resourceId": resource_oid,
            "recipientUserId": recipient_oid,
            "permissions": req.permissions,
            "expiresAt": req.expiresAt,
            "revokedAt": None,
            "createdAt": now,
        }
        res = await db["shares"].insert_one(share_doc)
        share_id = res.inserted_id

    # 4. Log audit event
    await log_audit_event(
        db,
        actor_user_id=user_id,
        action="share.create",
        resource_type=req.resourceType,
        resource_id=str(resource_oid),
        metadata={
            "recipientEmail": recipient_email,
            "permissions": req.permissions,
            "expiresAt": req.expiresAt.isoformat() if req.expiresAt else None,
        },
    )

    owner_user = await db["users"].find_one({"_id": user_oid})
    owner_email = owner_user.get("email") if owner_user else None

    return ShareResponse(
        id=str(share_id),
        ownerId=user_id,
        ownerEmail=owner_email,
        resourceType=req.resourceType,
        resourceId=str(resource_oid),
        resourceTitle=resource_title,
        recipientUserId=str(recipient_oid),
        recipientEmail=recipient_email,
        permissions=req.permissions,
        expiresAt=req.expiresAt,
        revokedAt=None,
        createdAt=now,
        isActive=True,
    )


async def list_outbound_shares(
    db: AsyncIOMotorDatabase,
    user_id: str,
) -> list[ShareResponse]:
    """Shares created by the current user."""
    user_oid = ObjectId(user_id)
    cursor = db["shares"].find({"ownerId": user_oid}).sort("createdAt", -1)
    share_docs = await cursor.to_list(length=100)

    now = datetime.now(timezone.utc)
    results: list[ShareResponse] = []
    for s in share_docs:
        recip_user = await db["users"].find_one({"_id": s["recipientUserId"]})
        recip_email = recip_user.get("email") if recip_user else None

        title = "Resource"
        if s["resourceType"] == "item":
            item = await db["items"].find_one({"_id": s["resourceId"]})
            if item:
                title = item.get("title", "Untitled")
        elif s["resourceType"] == "album":
            album = await db["albums"].find_one({"_id": s["resourceId"]})
            if album:
                title = album.get("title", "Untitled")

        is_active = (s.get("revokedAt") is None) and (
            s.get("expiresAt") is None or s["expiresAt"] > now
        )

        results.append(ShareResponse(
            id=str(s["_id"]),
            ownerId=user_id,
            resourceType=s["resourceType"],
            resourceId=str(s["resourceId"]),
            resourceTitle=title,
            recipientUserId=str(s["recipientUserId"]),
            recipientEmail=recip_email,
            permissions=s["permissions"],
            expiresAt=s.get("expiresAt"),
            revokedAt=s.get("revokedAt"),
            createdAt=s["createdAt"],
            isActive=is_active,
        ))

    return results


async def list_inbound_shares(
    db: AsyncIOMotorDatabase,
    user_id: str,
) -> list[ShareResponse]:
    """Shares granted to the current user that are active and not revoked/expired."""
    user_oid = ObjectId(user_id)
    now = datetime.now(timezone.utc)

    query = {
        "recipientUserId": user_oid,
        "revokedAt": None,
        "$or": [
            {"expiresAt": None},
            {"expiresAt": {"$gt": now}},
        ],
    }

    cursor = db["shares"].find(query).sort("createdAt", -1)
    share_docs = await cursor.to_list(length=100)

    results: list[ShareResponse] = []
    for s in share_docs:
        owner_user = await db["users"].find_one({"_id": s["ownerId"]})
        owner_email = owner_user.get("email") if owner_user else None

        title = "Resource"
        if s["resourceType"] == "item":
            item = await db["items"].find_one({"_id": s["resourceId"], "deletedAt": None})
            if not item:
                continue
            title = item.get("title", "Untitled")
        elif s["resourceType"] == "album":
            album = await db["albums"].find_one({"_id": s["resourceId"]})
            if not album:
                continue
            title = album.get("title", "Untitled")

        results.append(ShareResponse(
            id=str(s["_id"]),
            ownerId=str(s["ownerId"]),
            ownerEmail=owner_email,
            resourceType=s["resourceType"],
            resourceId=str(s["resourceId"]),
            resourceTitle=title,
            recipientUserId=user_id,
            recipientEmail=None,
            permissions=s["permissions"],
            expiresAt=s.get("expiresAt"),
            revokedAt=None,
            createdAt=s["createdAt"],
            isActive=True,
        ))

    return results


async def revoke_share(
    db: AsyncIOMotorDatabase,
    user_id: str,
    share_id_str: str,
) -> bool:
    if not ObjectId.is_valid(share_id_str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid share ID")

    share_oid = ObjectId(share_id_str)
    user_oid = ObjectId(user_id)

    share = await db["shares"].find_one({"_id": share_oid, "ownerId": user_oid})
    if not share:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Share grant not found or not owned by you",
        )

    now = datetime.now(timezone.utc)
    await db["shares"].update_one(
        {"_id": share_oid},
        {"$set": {"revokedAt": now}},
    )

    await log_audit_event(
        db,
        actor_user_id=user_id,
        action="share.revoke",
        resource_type=share["resourceType"],
        resource_id=str(share["resourceId"]),
        metadata={"shareId": share_id_str},
    )

    return True


async def check_resource_access(
    db: AsyncIOMotorDatabase,
    user_id: str,
    resource_type: ResourceType,
    resource_id_str: str,
    required_permission: SharePermission = "view",
) -> tuple[bool, str, SharePermission]:
    """
    Check if a user has access to a resource.
    Returns (has_access, role ['owner' or 'recipient'], permissions).
    """
    if not ObjectId.is_valid(resource_id_str):
        return False, "none", "view"

    resource_oid = ObjectId(resource_id_str)
    user_oid = ObjectId(user_id)

    # 1. Check ownership
    collection_name = "items" if resource_type == "item" else "albums"
    owner_doc = await db[collection_name].find_one({"_id": resource_oid, "ownerId": user_oid})
    if owner_doc:
        return True, "owner", "edit"

    # 2. Check active share grant
    now = datetime.now(timezone.utc)
    share = await db["shares"].find_one({
        "recipientUserId": user_oid,
        "resourceType": resource_type,
        "resourceId": resource_oid,
        "revokedAt": None,
        "$or": [
            {"expiresAt": None},
            {"expiresAt": {"$gt": now}},
        ],
    })

    if not share:
        return False, "none", "view"

    if required_permission == "edit" and share["permissions"] != "edit":
        return False, "recipient", share["permissions"]

    return True, "recipient", share["permissions"]


async def get_shared_item(
    db: AsyncIOMotorDatabase,
    user_id: str,
    item_id_str: str,
) -> SharedItemResponse:
    has_access, role, perm = await check_resource_access(
        db, user_id, "item", item_id_str, "view"
    )
    if not has_access:
        # Log denied attempt
        await log_audit_event(
            db,
            actor_user_id=user_id,
            action="share.access",
            resource_type="item",
            resource_id=item_id_str,
            outcome="denied",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this shared item",
        )

    item = await db["items"].find_one({
        "_id": ObjectId(item_id_str),
        "deletedAt": None,
    })
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # Fetch file assets linked to this item
    files_cursor = db["file_assets"].find({
        "itemId": item["_id"],
        "deletedAt": None,
    })
    file_docs = await files_cursor.to_list(length=50)

    files_list = [
        FileAssetResponse(
            id=str(f["_id"]),
            ownerId=str(f["ownerId"]),
            itemId=str(f["itemId"]),
            originalName=f["originalName"],
            mimeType=f["mimeType"],
            sizeBytes=f["sizeBytes"],
            storage=f.get("storage", "gridfs"),
            gridFsId=str(f["gridFsId"]),
            scanStatus=f.get("scanStatus", "clean"),
            uploadedAt=f["uploadedAt"],
        )
        for f in file_docs
    ]

    owner_user = await db["users"].find_one({"_id": item["ownerId"]})
    owner_email = owner_user.get("email") if owner_user else None

    # Log successful access
    await log_audit_event(
        db,
        actor_user_id=user_id,
        action="share.access",
        resource_type="item",
        resource_id=item_id_str,
        outcome="success",
    )

    return SharedItemResponse(
        id=str(item["_id"]),
        ownerId=str(item["ownerId"]),
        ownerEmail=owner_email,
        collectionId=str(item["collectionId"]) if item.get("collectionId") else None,
        title=item["title"],
        kind=item["kind"],
        description=item.get("description"),
        tags=item.get("tags", []),
        customFields=item.get("customFields", {}),
        content=item.get("content"),
        url=item.get("url"),
        fileIds=[str(fid) for fid in item.get("fileIds", [])],
        files=files_list,
        permissions=perm,
        createdAt=item["createdAt"],
        updatedAt=item["updatedAt"],
    )


async def stream_shared_file(
    db: AsyncIOMotorDatabase,
    user_id: str,
    file_id_str: str,
    preview: bool = False,
) -> StreamingResponse:
    if not ObjectId.is_valid(file_id_str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file ID")

    file_doc = await db["file_assets"].find_one({
        "_id": ObjectId(file_id_str),
        "deletedAt": None,
    })
    if not file_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File asset not found")

    item_id_str = str(file_doc["itemId"])
    has_access, role, perm = await check_resource_access(
        db, user_id, "item", item_id_str, "view"
    )
    if not has_access:
        await log_audit_event(
            db,
            actor_user_id=user_id,
            action="share.file_download",
            resource_type="file",
            resource_id=file_id_str,
            outcome="denied",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to download this file",
        )

    grid_fs_id = file_doc["gridFsId"]
    storage = GridFSStorage(db)

    try:
        grid_out = await storage.open_download_stream(grid_fs_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File content not found in storage",
        )

    async def file_iterator():
        try:
            while True:
                chunk = await grid_out.readchunk()
                if not chunk:
                    break
                yield chunk
        finally:
            grid_out.close()

    filename = file_doc["originalName"]
    encoded_filename = urllib.parse.quote(filename)
    disposition_type = "inline" if preview else "attachment"
    content_disposition = f"{disposition_type}; filename*=UTF-8''{encoded_filename}"

    await log_audit_event(
        db,
        actor_user_id=user_id,
        action="share.file_download",
        resource_type="file",
        resource_id=file_id_str,
        outcome="success",
        metadata={"filename": filename},
    )

    return StreamingResponse(
        file_iterator(),
        media_type=file_doc["mimeType"],
        headers={
            "Content-Disposition": content_disposition,
            "Content-Length": str(file_doc["sizeBytes"]),
            "X-Content-Type-Options": "nosniff",
        },
    )
