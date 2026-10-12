from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from app.schemas.family import (
    FamilyCreateRequest,
    FamilyInviteRequest,
    FamilyInviteRespondRequest,
    FamilyResponse,
    FamilyMemberResponse,
    FamilyPendingInviteResponse,
)
from app.services.audit_service import log_audit_event

logger = logging.getLogger("ownly.services.family")


async def create_family(
    db: AsyncIOMotorDatabase,
    user_id: str,
    req: FamilyCreateRequest,
) -> FamilyResponse:
    now = datetime.now(timezone.utc)
    creator_oid = ObjectId(user_id)

    family_doc = {
        "name": req.name.strip(),
        "createdBy": creator_oid,
        "createdAt": now,
        "updatedAt": now,
    }
    res = await db["families"].insert_one(family_doc)
    family_id = res.inserted_id

    # Add creator as accepted admin member
    member_doc = {
        "familyId": family_id,
        "userId": creator_oid,
        "role": "admin",
        "status": "accepted",
        "invitedBy": creator_oid,
        "createdAt": now,
    }
    member_res = await db["family_members"].insert_one(member_doc)

    # Get user email
    user = await db["users"].find_one({"_id": creator_oid})
    email = user.get("email") if user else None
    display_name = user.get("displayName") if user else None

    await log_audit_event(
        db,
        actor_user_id=user_id,
        action="family.create",
        resource_type="family",
        resource_id=family_id,
        metadata={"name": req.name},
    )

    admin_member = FamilyMemberResponse(
        id=str(member_res.inserted_id),
        familyId=str(family_id),
        userId=user_id,
        email=email,
        displayName=display_name,
        role="admin",
        status="accepted",
        invitedBy=user_id,
        createdAt=now,
    )

    return FamilyResponse(
        id=str(family_id),
        name=req.name.strip(),
        createdBy=user_id,
        createdAt=now,
        updatedAt=now,
        userRole="admin",
        memberCount=1,
        members=[admin_member],
    )


async def list_user_families(
    db: AsyncIOMotorDatabase,
    user_id: str,
) -> list[FamilyResponse]:
    user_oid = ObjectId(user_id)
    # Find all accepted memberships
    cursor = db["family_members"].find({"userId": user_oid, "status": "accepted"})
    memberships = await cursor.to_list(length=100)

    families: list[FamilyResponse] = []
    for m in memberships:
        family_id = m["familyId"]
        family_doc = await db["families"].find_one({"_id": family_id})
        if not family_doc:
            continue

        member_count = await db["family_members"].count_documents({
            "familyId": family_id,
            "status": "accepted",
        })

        families.append(FamilyResponse(
            id=str(family_doc["_id"]),
            name=family_doc["name"],
            createdBy=str(family_doc["createdBy"]),
            createdAt=family_doc["createdAt"],
            updatedAt=family_doc["updatedAt"],
            userRole=m["role"],
            memberCount=member_count,
            members=[],
        ))

    return families


async def list_pending_invites(
    db: AsyncIOMotorDatabase,
    user_id: str,
) -> list[FamilyPendingInviteResponse]:
    user_oid = ObjectId(user_id)
    cursor = db["family_members"].find({"userId": user_oid, "status": "pending"})
    invites = await cursor.to_list(length=50)

    result: list[FamilyPendingInviteResponse] = []
    for inv in invites:
        family = await db["families"].find_one({"_id": inv["familyId"]})
        if not family:
            continue
        inviter = await db["users"].find_one({"_id": inv.get("invitedBy")})
        inviter_email = inviter.get("email") if inviter else None

        result.append(FamilyPendingInviteResponse(
            id=str(inv["_id"]),
            familyId=str(inv["familyId"]),
            familyName=family["name"],
            invitedByEmail=inviter_email,
            role=inv["role"],
            createdAt=inv["createdAt"],
        ))

    return result


async def get_family_details(
    db: AsyncIOMotorDatabase,
    user_id: str,
    family_id_str: str,
) -> FamilyResponse:
    if not ObjectId.is_valid(family_id_str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid family ID")

    family_oid = ObjectId(family_id_str)
    user_oid = ObjectId(user_id)

    # Check caller is accepted member
    caller_member = await db["family_members"].find_one({
        "familyId": family_oid,
        "userId": user_oid,
        "status": "accepted",
    })
    if not caller_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not an active member of this family",
        )

    family_doc = await db["families"].find_one({"_id": family_oid})
    if not family_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Family not found")

    # Fetch all members (both accepted and pending)
    cursor = db["family_members"].find({"familyId": family_oid})
    member_docs = await cursor.to_list(length=100)

    member_responses: list[FamilyMemberResponse] = []
    accepted_count = 0
    for m in member_docs:
        if m["status"] == "accepted":
            accepted_count += 1
        user_info = await db["users"].find_one({"_id": m["userId"]})
        member_responses.append(FamilyMemberResponse(
            id=str(m["_id"]),
            familyId=family_id_str,
            userId=str(m["userId"]),
            email=user_info.get("email") if user_info else None,
            displayName=user_info.get("displayName") if user_info else None,
            role=m["role"],
            status=m["status"],
            invitedBy=str(m["invitedBy"]) if m.get("invitedBy") else None,
            createdAt=m["createdAt"],
        ))

    return FamilyResponse(
        id=family_id_str,
        name=family_doc["name"],
        createdBy=str(family_doc["createdBy"]),
        createdAt=family_doc["createdAt"],
        updatedAt=family_doc["updatedAt"],
        userRole=caller_member["role"],
        memberCount=accepted_count,
        members=member_responses,
    )


async def invite_family_member(
    db: AsyncIOMotorDatabase,
    user_id: str,
    family_id_str: str,
    req: FamilyInviteRequest,
) -> FamilyMemberResponse:
    if not ObjectId.is_valid(family_id_str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid family ID")

    family_oid = ObjectId(family_id_str)
    user_oid = ObjectId(user_id)

    # Caller must be admin
    caller_member = await db["family_members"].find_one({
        "familyId": family_oid,
        "userId": user_oid,
        "role": "admin",
        "status": "accepted",
    })
    if not caller_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only family administrators can invite new members",
        )

    # Find target user by email
    target_email = req.email.lower().strip()
    target_user = await db["users"].find_one({"email": target_email})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No registered user found with email '{target_email}'",
        )

    target_oid = target_user["_id"]
    if target_oid == user_oid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot invite yourself to the family",
        )

    # Check if already a member or pending
    existing = await db["family_members"].find_one({
        "familyId": family_oid,
        "userId": target_oid,
    })
    if existing:
        if existing["status"] == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already an active member of this family",
            )
        elif existing["status"] == "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has a pending invitation to this family",
            )

    now = datetime.now(timezone.utc)
    new_member_doc = {
        "familyId": family_oid,
        "userId": target_oid,
        "role": req.role,
        "status": "pending",
        "invitedBy": user_oid,
        "createdAt": now,
    }
    res = await db["family_members"].insert_one(new_member_doc)

    await log_audit_event(
        db,
        actor_user_id=user_id,
        action="family.invite",
        resource_type="family",
        resource_id=family_id_str,
        metadata={"recipientEmail": target_email, "role": req.role},
    )

    return FamilyMemberResponse(
        id=str(res.inserted_id),
        familyId=family_id_str,
        userId=str(target_oid),
        email=target_user.get("email"),
        displayName=target_user.get("displayName"),
        role=req.role,
        status="pending",
        invitedBy=user_id,
        createdAt=now,
    )


async def respond_to_invite(
    db: AsyncIOMotorDatabase,
    user_id: str,
    invite_id_str: str,
    req: FamilyInviteRespondRequest,
) -> FamilyMemberResponse:
    if not ObjectId.is_valid(invite_id_str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite ID")

    invite_oid = ObjectId(invite_id_str)
    user_oid = ObjectId(user_id)

    member_doc = await db["family_members"].find_one({
        "_id": invite_oid,
        "userId": user_oid,
        "status": "pending",
    })
    if not member_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pending family invitation not found",
        )

    await db["family_members"].update_one(
        {"_id": invite_oid},
        {"$set": {"status": req.status}},
    )

    await log_audit_event(
        db,
        actor_user_id=user_id,
        action="family.invite_respond",
        resource_type="family",
        resource_id=member_doc["familyId"],
        outcome="success",
        metadata={"status": req.status},
    )

    user_info = await db["users"].find_one({"_id": user_oid})
    return FamilyMemberResponse(
        id=invite_id_str,
        familyId=str(member_doc["familyId"]),
        userId=user_id,
        email=user_info.get("email") if user_info else None,
        displayName=user_info.get("displayName") if user_info else None,
        role=member_doc["role"],
        status=req.status,
        invitedBy=str(member_doc["invitedBy"]),
        createdAt=member_doc["createdAt"],
    )


async def remove_family_member(
    db: AsyncIOMotorDatabase,
    user_id: str,
    family_id_str: str,
    target_user_id_str: str,
) -> bool:
    if not ObjectId.is_valid(family_id_str) or not ObjectId.is_valid(target_user_id_str):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ID format")

    family_oid = ObjectId(family_id_str)
    caller_oid = ObjectId(user_id)
    target_oid = ObjectId(target_user_id_str)

    # Check caller role
    caller_member = await db["family_members"].find_one({
        "familyId": family_oid,
        "userId": caller_oid,
        "status": "accepted",
    })
    if not caller_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a family member")

    # If caller != target, caller must be admin
    if caller_oid != target_oid and caller_member["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can remove other members",
        )

    res = await db["family_members"].delete_one({
        "familyId": family_oid,
        "userId": target_oid,
    })
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    await log_audit_event(
        db,
        actor_user_id=user_id,
        action="family.member_remove",
        resource_type="family",
        resource_id=family_id_str,
        metadata={"targetUserId": target_user_id_str},
    )

    return True

