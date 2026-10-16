from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from app.schemas.item import ItemResponse
from app.services.trash_service import TrashService
from app.security.dependencies import get_db, get_current_user

router = APIRouter(prefix="", tags=["Trash"])


@router.get("/trash", response_model=List[ItemResponse], summary="List all trashed items for current user")
async def list_trash(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = TrashService(db)
    return await service.list_trash(current_user["id"])


@router.delete("/items/{item_id}/permanent", summary="Permanently delete a trashed item and its files")
async def permanently_delete_item(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = TrashService(db)
    await service.permanently_delete_item(item_id, current_user["id"])
    return {"message": "Item and attached files permanently deleted."}


@router.delete("/trash/empty", summary="Empty all trashed items and purge their stored files")
async def empty_trash(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = TrashService(db)
    count = await service.empty_trash(current_user["id"])
    return {"message": f"Emptied trash. {count} items permanently deleted."}

