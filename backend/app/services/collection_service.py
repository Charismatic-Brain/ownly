from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import List, Dict, Any, Optional
from app.repositories.collection_repository import CollectionRepository
from app.schemas.collection import (
    CollectionCreateRequest,
    CollectionUpdateRequest,
    CollectionResponse
)
import logging

logger = logging.getLogger("ownly.services.collection")


class CollectionService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repo = CollectionRepository(db)

    async def _check_cycle(self, collection_id: str, proposed_parent_id: str, owner_id: str) -> None:
        """Ensure setting proposed_parent_id doesn't create a circular reference."""
        if collection_id == proposed_parent_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A collection cannot be its own parent."
            )

        # Traverse up from proposed_parent_id to ensure it never hits collection_id
        curr_id: Optional[str] = proposed_parent_id
        visited = set()
        while curr_id:
            if curr_id in visited:
                break
            visited.add(curr_id)
            if curr_id == collection_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Circular hierarchy detected. A collection cannot be placed inside one of its descendants."
                )
            parent = await self.repo.find_by_id_and_owner(curr_id, owner_id)
            if not parent:
                break
            curr_id = parent.get("parentId")

    async def list_collections(self, owner_id: str) -> List[CollectionResponse]:
        collections = await self.repo.find_all_by_owner(owner_id)

        # Count active items per collection
        counts = {}
        pipeline = [
            {"$match": {"ownerId": ObjectId(owner_id), "deletedAt": None, "collectionId": {"$ne": None}}},
            {"$group": {"_id": "$collectionId", "count": {"$sum": 1}}}
        ]
        async for group in self.db["items"].aggregate(pipeline):
            counts[str(group["_id"])] = group["count"]

        response_list = []
        for col in collections:
            col["itemCount"] = counts.get(col["id"], 0)
            response_list.append(CollectionResponse(**col))

        return response_list

    async def get_collection(self, collection_id: str, owner_id: str) -> CollectionResponse:
        col = await self.repo.find_by_id_and_owner(collection_id, owner_id)
        if not col:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found."
            )

        count = await self.db["items"].count_documents({
            "ownerId": ObjectId(owner_id),
            "collectionId": ObjectId(collection_id),
            "deletedAt": None
        })
        col["itemCount"] = count
        return CollectionResponse(**col)

    async def create_collection(self, req: CollectionCreateRequest, owner_id: str) -> CollectionResponse:
        # If parentId is specified, verify it exists and belongs to owner
        if req.parentId:
            parent = await self.repo.find_by_id_and_owner(req.parentId, owner_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent collection not found or does not belong to you."
                )

        fields = [f.model_dump() for f in req.fieldDefinitions] if req.fieldDefinitions else []
        col = await self.repo.create_collection(
            owner_id=owner_id,
            name=req.name,
            description=req.description or "",
            icon=req.icon or "folder",
            parent_id=req.parentId,
            field_definitions=fields
        )
        col["itemCount"] = 0
        return CollectionResponse(**col)

    async def update_collection(
        self,
        collection_id: str,
        req: CollectionUpdateRequest,
        owner_id: str
    ) -> CollectionResponse:
        existing = await self.repo.find_by_id_and_owner(collection_id, owner_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found."
            )

        update_dict = req.model_dump(exclude_unset=True)

        # Check parent hierarchy and prevent cycles
        if "parentId" in update_dict and update_dict["parentId"] is not None:
            parent_id = update_dict["parentId"]
            parent = await self.repo.find_by_id_and_owner(parent_id, owner_id)
            if not parent:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Parent collection not found or does not belong to you."
                )
            await self._check_cycle(collection_id, parent_id, owner_id)

        if "fieldDefinitions" in update_dict and update_dict["fieldDefinitions"] is not None:
            update_dict["fieldDefinitions"] = [
                f if isinstance(f, dict) else f.model_dump() for f in update_dict["fieldDefinitions"]
            ]

        updated = await self.repo.update_collection(collection_id, owner_id, update_dict)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection could not be updated."
            )

        count = await self.db["items"].count_documents({
            "ownerId": ObjectId(owner_id),
            "collectionId": ObjectId(collection_id),
            "deletedAt": None
        })
        updated["itemCount"] = count
        return CollectionResponse(**updated)

    async def delete_collection(self, collection_id: str, owner_id: str) -> None:
        deleted = await self.repo.soft_delete_collection(collection_id, owner_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection not found."
            )

