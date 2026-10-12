from typing import Dict, Any
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_database
from app.security.dependencies import get_current_user
from app.schemas.family import (
    FamilyCreateRequest,
    FamilyInviteRequest,
    FamilyInviteRespondRequest,
    FamilyResponse,
    FamilyMemberResponse,
    FamilyPendingInviteResponse,
)
from app.services import family_service

router = APIRouter(prefix="/families", tags=["family"])


@router.post("", response_model=FamilyResponse, status_code=status.HTTP_201_CREATED)
async def create_family_endpoint(
    req: FamilyCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Create a new family group and make current user the admin."""
    return await family_service.create_family(db, current_user["id"], req)


@router.get("", response_model=list[FamilyResponse])
async def list_families_endpoint(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List all family groups current user is a member of."""
    return await family_service.list_user_families(db, current_user["id"])


@router.get("/invites/pending", response_model=list[FamilyPendingInviteResponse])
async def list_pending_invites_endpoint(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List pending family invitations received by current user."""
    return await family_service.list_pending_invites(db, current_user["id"])


@router.get("/{family_id}", response_model=FamilyResponse)
async def get_family_endpoint(
    family_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Get family group details and its member roster."""
    return await family_service.get_family_details(db, current_user["id"], family_id)


@router.post("/{family_id}/invites", response_model=FamilyMemberResponse, status_code=status.HTTP_201_CREATED)
async def invite_member_endpoint(
    family_id: str,
    req: FamilyInviteRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Invite a user to the family by email (admin only)."""
    return await family_service.invite_family_member(db, current_user["id"], family_id, req)


@router.post("/invites/{invite_id}/respond", response_model=FamilyMemberResponse)
async def respond_invite_endpoint(
    invite_id: str,
    req: FamilyInviteRespondRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Accept or reject a pending family invite."""
    return await family_service.respond_to_invite(db, current_user["id"], invite_id, req)


@router.delete("/{family_id}/members/{target_user_id}")
async def remove_member_endpoint(
    family_id: str,
    target_user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Remove a member from the family (admin only, or member leaving)."""
    await family_service.remove_family_member(db, current_user["id"], family_id, target_user_id)
    return {"status": "success", "message": "Member removed from family"}

