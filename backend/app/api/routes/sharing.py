from typing import Dict, Any
from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_database
from app.security.dependencies import get_current_user
from app.schemas.sharing import (
    ShareCreateRequest,
    ShareResponse,
    SharedItemResponse,
)
from app.services import sharing_service

router = APIRouter(prefix="/shares", tags=["sharing"])


@router.post("", response_model=ShareResponse, status_code=status.HTTP_201_CREATED)
async def create_share_endpoint(
    req: ShareCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Share a vault item or album with another user."""
    return await sharing_service.create_share(db, current_user["id"], req)


@router.get("/outbound", response_model=list[ShareResponse])
async def list_outbound_shares_endpoint(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List shares created by the current user."""
    return await sharing_service.list_outbound_shares(db, current_user["id"])


@router.get("/inbound", response_model=list[ShareResponse])
async def list_inbound_shares_endpoint(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List items and albums shared with the current user."""
    return await sharing_service.list_inbound_shares(db, current_user["id"])


@router.delete("/{share_id}")
async def revoke_share_endpoint(
    share_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Revoke an active share grant."""
    await sharing_service.revoke_share(db, current_user["id"], share_id)
    return {"status": "success", "message": "Share grant revoked successfully"}


@router.get("/items/{item_id}", response_model=SharedItemResponse)
async def get_shared_item_endpoint(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Fetch a shared item and its file attachments if authorized."""
    return await sharing_service.get_shared_item(db, current_user["id"], item_id)


@router.get("/files/{file_id}/download")
async def download_shared_file_endpoint(
    file_id: str,
    preview: bool = Query(False, description="Preview inline if true"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Authorized streaming download/preview of a file belonging to a shared item."""
    return await sharing_service.stream_shared_file(db, current_user["id"], file_id, preview=preview)

