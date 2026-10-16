from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
from app.schemas.item import (
    ItemCreateRequest,
    ItemUpdateRequest,
    ItemResponse,
    ItemListResponse
)
from app.services.item_service import ItemService
from app.security.dependencies import get_db, get_current_user

router = APIRouter(prefix="/items", tags=["Vault Items"])


@router.get("", response_model=ItemListResponse, summary="List and filter items")
async def list_items(
    collectionId: Optional[str] = Query(None, description="Filter by collection ID, or 'none' for uncollected"),
    kind: Optional[str] = Query(None, description="Filter by item kind (note, link, record, file)"),
    favorite: Optional[bool] = Query(None, description="Filter favorites"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    search: Optional[str] = Query(None, description="Search in title or description"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    includeDeleted: bool = Query(False, description="Include trashed items"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = ItemService(db)
    return await service.list_items(
        owner_id=current_user["id"],
        collection_id=collectionId,
        kind=kind,
        favorite=favorite,
        tag=tag,
        search=search,
        page=page,
        limit=limit,
        include_deleted=includeDeleted
    )


@router.post("", response_model=ItemResponse, status_code=status.HTTP_201_CREATED, summary="Create a new vault item")
async def create_item(
    req: ItemCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = ItemService(db)
    return await service.create_item(req, current_user["id"])


@router.get("/{item_id}", response_model=ItemResponse, summary="Get single item details")
async def get_item(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = ItemService(db)
    return await service.get_item(item_id, current_user["id"])


@router.patch("/{item_id}", response_model=ItemResponse, summary="Update an item")
async def update_item(
    item_id: str,
    req: ItemUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = ItemService(db)
    return await service.update_item(item_id, req, current_user["id"])


@router.post("/{item_id}/favorite", response_model=ItemResponse, summary="Toggle item favorite state")
async def toggle_favorite(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = ItemService(db)
    return await service.toggle_favorite(item_id, current_user["id"])


@router.delete("/{item_id}", summary="Soft delete an item (move to trash)")
async def delete_item(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = ItemService(db)
    await service.delete_item(item_id, current_user["id"])
    return {"message": "Item moved to trash."}


@router.post("/{item_id}/restore", response_model=ItemResponse, summary="Restore item from trash")
async def restore_item(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = ItemService(db)
    return await service.restore_item(item_id, current_user["id"])

