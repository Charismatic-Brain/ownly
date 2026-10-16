from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status, UploadFile
import logging

from app.storage.gridfs import GridFSStorage
from app.security.file_validation import signature_matches
from app.schemas.memories import (
    AlbumCreateRequest,
    AlbumUpdateRequest,
    AlbumResponse,
    MediaAssetResponse,
    MediaUpdateRequest,
    TimelineGroup,
    TimelineResponse,
)

logger = logging.getLogger("ownly.services.memories")

ALLOWED_MEDIA_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/quicktime",
    "video/webm",
}
MAX_MEDIA_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB


def _format_media(doc: Dict[str, Any], album_title: Optional[str] = None) -> MediaAssetResponse:
    media_id = str(doc["_id"])
    created_at = doc.get("createdAt", datetime.now(timezone.utc))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    taken_at = doc.get("takenAt")
    if taken_at and taken_at.tzinfo is None:
        taken_at = taken_at.replace(tzinfo=timezone.utc)

    return MediaAssetResponse(
        id=media_id,
        ownerId=str(doc["ownerId"]),
        albumId=str(doc["albumId"]) if doc.get("albumId") else None,
        albumTitle=album_title,
        originalName=doc.get("originalName", "media"),
        mimeType=doc.get("mimeType", "application/octet-stream"),
        sizeBytes=doc.get("sizeBytes", 0),
        caption=doc.get("caption", ""),
        takenAt=taken_at,
        tags=doc.get("tags", []),
        createdAt=created_at,
        previewUrl=f"/api/media/{media_id}/preview",
        downloadUrl=f"/api/media/{media_id}/download",
    )


def _format_album(doc: Dict[str, Any], media_list: Optional[List[MediaAssetResponse]] = None) -> AlbumResponse:
    created_at = doc.get("createdAt", datetime.now(timezone.utc))
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    updated_at = doc.get("updatedAt", datetime.now(timezone.utc))
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)

    event_date = doc.get("eventDate")
    if event_date and event_date.tzinfo is None:
        event_date = event_date.replace(tzinfo=timezone.utc)

    cover_id = str(doc["coverMediaId"]) if doc.get("coverMediaId") else None

    return AlbumResponse(
        id=str(doc["_id"]),
        ownerId=str(doc["ownerId"]),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        eventDate=event_date,
        tags=doc.get("tags", []),
        coverMediaId=cover_id,
        mediaCount=doc.get("mediaCount", 0),
        media=media_list,
        createdAt=created_at,
        updatedAt=updated_at,
    )


# ---------------------------------------------------------
# Albums CRUD
# ---------------------------------------------------------

async def create_album(
    db: AsyncIOMotorDatabase,
    user_id: str,
    album_in: AlbumCreateRequest
) -> AlbumResponse:
    owner_oid = ObjectId(user_id)
    event_date = album_in.eventDate
    if event_date and event_date.tzinfo is None:
        event_date = event_date.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    doc = {
        "ownerId": owner_oid,
        "title": album_in.title.strip(),
        "description": album_in.description.strip() if album_in.description else "",
        "eventDate": event_date,
        "tags": album_in.tags or [],
        "coverMediaId": None,
        "mediaCount": 0,
        "createdAt": now,
        "updatedAt": now,
        "deletedAt": None,
    }

    res = await db["albums"].insert_one(doc)
    doc["_id"] = res.inserted_id
    return _format_album(doc, media_list=[])


async def list_albums(
    db: AsyncIOMotorDatabase,
    user_id: str
) -> List[AlbumResponse]:
    owner_oid = ObjectId(user_id)
    cursor = db["albums"].find({"ownerId": owner_oid, "deletedAt": None}).sort("createdAt", -1)
    docs = await cursor.to_list(length=100)

    # Calculate actual mediaCount for each album
    results = []
    for d in docs:
        count = await db["media_assets"].count_documents({"albumId": d["_id"], "deletedAt": None})
        d["mediaCount"] = count
        results.append(_format_album(d))
    return results


async def get_album(
    db: AsyncIOMotorDatabase,
    user_id: str,
    album_id: str
) -> AlbumResponse:
    if not ObjectId.is_valid(album_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid album ID format",
        )

    owner_oid = ObjectId(user_id)
    album_oid = ObjectId(album_id)

    album_doc = await db["albums"].find_one({"_id": album_oid, "ownerId": owner_oid, "deletedAt": None})
    if not album_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found",
        )

    # Fetch album media items
    media_cursor = db["media_assets"].find({"albumId": album_oid, "deletedAt": None}).sort("takenAt", -1)
    media_docs = await media_cursor.to_list(length=200)

    media_list = [_format_media(m, album_doc["title"]) for m in media_docs]
    album_doc["mediaCount"] = len(media_list)

    return _format_album(album_doc, media_list=media_list)


async def update_album(
    db: AsyncIOMotorDatabase,
    user_id: str,
    album_id: str,
    album_in: AlbumUpdateRequest
) -> AlbumResponse:
    if not ObjectId.is_valid(album_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid album ID format",
        )

    owner_oid = ObjectId(user_id)
    album_oid = ObjectId(album_id)

    existing = await db["albums"].find_one({"_id": album_oid, "ownerId": owner_oid, "deletedAt": None})
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found",
        )

    updates: Dict[str, Any] = {"updatedAt": datetime.now(timezone.utc)}
    if album_in.title is not None:
        updates["title"] = album_in.title.strip()
    if album_in.description is not None:
        updates["description"] = album_in.description.strip()
    if album_in.eventDate is not None:
        ed = album_in.eventDate
        if ed.tzinfo is None:
            ed = ed.replace(tzinfo=timezone.utc)
        updates["eventDate"] = ed
    if album_in.tags is not None:
        updates["tags"] = album_in.tags
    if album_in.coverMediaId is not None:
        if album_in.coverMediaId == "":
            updates["coverMediaId"] = None
        elif ObjectId.is_valid(album_in.coverMediaId):
            updates["coverMediaId"] = ObjectId(album_in.coverMediaId)

    await db["albums"].update_one({"_id": album_oid, "ownerId": owner_oid}, {"$set": updates})
    return await get_album(db, user_id, album_id)


async def delete_album(
    db: AsyncIOMotorDatabase,
    user_id: str,
    album_id: str
) -> Dict[str, str]:
    if not ObjectId.is_valid(album_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid album ID format",
        )

    owner_oid = ObjectId(user_id)
    album_oid = ObjectId(album_id)

    album = await db["albums"].find_one({"_id": album_oid, "ownerId": owner_oid})
    if not album:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Album not found",
        )

    # Purge all media in this album from GridFS
    storage = GridFSStorage(db)
    media_cursor = db["media_assets"].find({"albumId": album_oid, "ownerId": owner_oid})
    media_docs = await media_cursor.to_list(length=500)

    for m in media_docs:
        if m.get("gridFsId"):
            await storage.delete_file(m["gridFsId"])

    await db["media_assets"].delete_many({"albumId": album_oid, "ownerId": owner_oid})
    await db["albums"].delete_one({"_id": album_oid, "ownerId": owner_oid})

    return {"message": "Album and associated media deleted successfully"}


# ---------------------------------------------------------
# Media Assets Management & GridFS Storage
# ---------------------------------------------------------

async def upload_media_to_album(
    db: AsyncIOMotorDatabase,
    user_id: str,
    album_id: Optional[str],
    file: UploadFile,
    caption: str = "",
    taken_at: Optional[datetime] = None,
    tags: Optional[List[str]] = None,
) -> MediaAssetResponse:
    owner_oid = ObjectId(user_id)
    album_oid = None
    album_title = None

    if album_id:
        if not ObjectId.is_valid(album_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid album ID format",
            )
        album_oid = ObjectId(album_id)
        album = await db["albums"].find_one({"_id": album_oid, "ownerId": owner_oid, "deletedAt": None})
        if not album:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Album not found",
            )
        album_title = album["title"]

    mime_type = file.content_type or "application/octet-stream"
    if mime_type.lower() not in ALLOWED_MEDIA_MIMES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported media format '{mime_type}'. Supported: JPEG, PNG, WebP, GIF, MP4, WebM.",
        )

    # Stream chunks into memory/buffer and measure size
    storage = GridFSStorage(db)
    total_size = 0
    chunks: List[bytes] = []

    while True:
        chunk = await file.read(1024 * 64)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_MEDIA_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Media file exceeds maximum allowable size of 50 MB",
            )
        chunks.append(chunk)

    head = b"".join(chunks[:1])[:4096]
    if not signature_matches(mime_type, head):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File content does not match its declared type '{mime_type}'.",
        )

    async def chunk_generator():
        for ch in chunks:
            yield ch

    gridfs_id = await storage.upload_stream(
        filename=file.filename or "media_upload",
        stream=chunk_generator(),
        metadata={"ownerId": owner_oid, "mimeType": mime_type}
    )

    now = datetime.now(timezone.utc)
    media_doc = {
        "ownerId": owner_oid,
        "albumId": album_oid,
        "originalName": file.filename or "photo.jpg",
        "mimeType": mime_type,
        "sizeBytes": total_size,
        "storage": "gridfs",
        "gridFsId": gridfs_id,
        "caption": caption.strip() if caption else "",
        "takenAt": taken_at or now,
        "tags": tags or [],
        "createdAt": now,
        "updatedAt": now,
        "deletedAt": None,
    }

    res = await db["media_assets"].insert_one(media_doc)
    media_doc["_id"] = res.inserted_id

    # If album exists, increment count and set cover if unset
    if album_oid:
        await db["albums"].update_one(
            {"_id": album_oid, "coverMediaId": None},
            {"$set": {"coverMediaId": media_doc["_id"]}}
        )

    return _format_media(media_doc, album_title)


async def get_media_stream(
    db: AsyncIOMotorDatabase,
    user_id: str,
    media_id: str
) -> Tuple[Any, str, str]:
    if not ObjectId.is_valid(media_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid media ID format",
        )

    owner_oid = ObjectId(user_id)
    doc = await db["media_assets"].find_one({
        "_id": ObjectId(media_id),
        "ownerId": owner_oid,
        "deletedAt": None,
    })
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media asset not found",
        )

    storage = GridFSStorage(db)
    stream = await storage.open_download_stream(doc["gridFsId"])
    return stream, doc["originalName"], doc["mimeType"]


async def get_media_timeline(
    db: AsyncIOMotorDatabase,
    user_id: str
) -> TimelineResponse:
    owner_oid = ObjectId(user_id)
    cursor = db["media_assets"].find({"ownerId": owner_oid, "deletedAt": None}).sort("takenAt", -1)
    docs = await cursor.to_list(length=300)

    # Get album titles map
    album_ids = [d["albumId"] for d in docs if d.get("albumId")]
    albums_cursor = db["albums"].find({"_id": {"$in": album_ids}}, {"_id": 1, "title": 1})
    albums = await albums_cursor.to_list(length=len(album_ids))
    album_map = {str(a["_id"]): a.get("title", "") for a in albums}

    # Group by month (e.g. "October 2026")
    grouped: Dict[str, List[MediaAssetResponse]] = {}
    for d in docs:
        taken = d.get("takenAt") or d.get("createdAt") or datetime.now(timezone.utc)
        if taken.tzinfo is None:
            taken = taken.replace(tzinfo=timezone.utc)
        period = taken.strftime("%B %Y")

        a_title = album_map.get(str(d["albumId"])) if d.get("albumId") else None
        formatted = _format_media(d, a_title)

        if period not in grouped:
            grouped[period] = []
        grouped[period].append(formatted)

    timeline_groups = [
        TimelineGroup(period=p, items=items)
        for p, items in grouped.items()
    ]

    return TimelineResponse(
        groups=timeline_groups,
        totalMedia=len(docs),
    )


async def delete_media(
    db: AsyncIOMotorDatabase,
    user_id: str,
    media_id: str
) -> Dict[str, str]:
    if not ObjectId.is_valid(media_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid media ID format",
        )

    owner_oid = ObjectId(user_id)
    doc = await db["media_assets"].find_one({"_id": ObjectId(media_id), "ownerId": owner_oid})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media asset not found",
        )

    storage = GridFSStorage(db)
    if doc.get("gridFsId"):
        await storage.delete_file(doc["gridFsId"])

    await db["media_assets"].delete_one({"_id": ObjectId(media_id), "ownerId": owner_oid})

    # If album had this as coverMediaId, unset it
    if doc.get("albumId"):
        await db["albums"].update_one(
            {"_id": doc["albumId"], "coverMediaId": ObjectId(media_id)},
            {"$set": {"coverMediaId": None}}
        )

    return {"message": "Media asset deleted successfully"}

