from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, List, Dict, Any
import math
from app.repositories.item_repository import ItemRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.file_repository import FileRepository
from app.schemas.item import (
    ItemCreateRequest,
    ItemUpdateRequest,
    ItemResponse,
    ItemListResponse
)
import logging

logger = logging.getLogger("ownly.services.item")


class ItemService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.item_repo = ItemRepository(db)
        self.col_repo = CollectionRepository(db)
        self.file_repo = FileRepository(db)

    async def _verify_collection_ownership(self, collection_id: Optional[str], owner_id: str) -> None:
        """Verify that a referenced collection belongs to the authenticated user."""
        if collection_id:
            col = await self.col_repo.find_by_id_and_owner(collection_id, owner_id)
            if not col:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Target collection does not exist or does not belong to you."
                )

    async def list_items(
        self,
        owner_id: str,
        collection_id: Optional[str] = None,
        kind: Optional[str] = None,
        favorite: Optional[bool] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        include_deleted: bool = False
    ) -> ItemListResponse:
        page = max(1, page)
        limit = max(1, min(100, limit))

        items, total = await self.item_repo.find_items(
            owner_id=owner_id,
            collection_id=collection_id,
            kind=kind,
            favorite=favorite,
            tag=tag,
            search=search,
            page=page,
            limit=limit,
            include_deleted=include_deleted
        )

        # Populate files for items that have fileIds
        response_items = []
        for item in items:
            if item.get("fileIds"):
                item_files = await self.file_repo.find_by_item_id_and_owner(item["id"], owner_id)
                item["files"] = item_files
            else:
                item["files"] = []
            response_items.append(ItemResponse(**item))

        total_pages = math.ceil(total / limit) if total > 0 else 1

        return ItemListResponse(
            items=response_items,
            total=total,
            page=page,
            limit=limit,
            totalPages=total_pages
        )

    async def get_item(self, item_id: str, owner_id: str) -> ItemResponse:
        item = await self.item_repo.find_by_id_and_owner(item_id, owner_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found."
            )
        item["files"] = await self.file_repo.find_by_item_id_and_owner(item_id, owner_id)
        return ItemResponse(**item)

    async def create_item(self, req: ItemCreateRequest, owner_id: str) -> ItemResponse:
        # Validate collection ownership if specified
        await self._verify_collection_ownership(req.collectionId, owner_id)

        # Kind-specific validations
        if req.kind == "link" and not req.url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="URL is required for items of type 'link'."
            )

        item = await self.item_repo.create_item(
            owner_id=owner_id,
            title=req.title,
            kind=req.kind,
            description=req.description or "",
            collection_id=req.collectionId,
            tags=req.tags or [],
            custom_fields=req.customFields or {},
            content=req.content,
            url=req.url,
            favorite=req.favorite or False,
            event_date=req.eventDate,
            expires_at=req.expiresAt
        )
        return ItemResponse(**item)

    async def update_item(self, item_id: str, req: ItemUpdateRequest, owner_id: str) -> ItemResponse:
        existing = await self.item_repo.find_by_id_and_owner(item_id, owner_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found."
            )

        update_dict = req.model_dump(exclude_unset=True)

        if "collectionId" in update_dict and update_dict["collectionId"] is not None:
            await self._verify_collection_ownership(update_dict["collectionId"], owner_id)

        # If updated to link kind without url
        current_kind = existing["kind"]
        if current_kind == "link":
            if "url" in update_dict and not update_dict["url"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="URL cannot be empty for items of type 'link'."
                )

        updated = await self.item_repo.update_item(item_id, owner_id, update_dict)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item could not be updated."
            )
        return ItemResponse(**updated)

    async def toggle_favorite(self, item_id: str, owner_id: str) -> ItemResponse:
        updated = await self.item_repo.toggle_favorite(item_id, owner_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found."
            )
        return ItemResponse(**updated)

    async def delete_item(self, item_id: str, owner_id: str) -> None:
        deleted = await self.item_repo.soft_delete_item(item_id, owner_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found."
            )

    async def restore_item(self, item_id: str, owner_id: str) -> ItemResponse:
        restored = await self.item_repo.restore_item(item_id, owner_id)
        if not restored:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found in trash."
            )
        return ItemResponse(**restored)

