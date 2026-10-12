from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import List, Dict, Any
from app.repositories.item_repository import ItemRepository
from app.repositories.file_repository import FileRepository
from app.storage.gridfs import GridFSStorage
from app.schemas.item import ItemResponse
from fastapi import HTTPException, status
import logging

logger = logging.getLogger("ownly.services.trash")


class TrashService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.item_repo = ItemRepository(db)
        self.file_repo = FileRepository(db)
        self.storage = GridFSStorage(db)

    async def list_trash(self, owner_id: str) -> List[ItemResponse]:
        query = {
            "ownerId": ObjectId(owner_id),
            "deletedAt": {"$ne": None}
        }
        cursor = self.db["items"].find(query).sort("deletedAt", -1)
        trashed: List[ItemResponse] = []
        async for doc in cursor:
            d = ItemRepository.doc_to_dict(doc)
            if d.get("fileIds"):
                d["files"] = await self.file_repo.find_by_item_id_and_owner(d["id"], owner_id)
            else:
                d["files"] = []
            trashed.append(ItemResponse(**d))
        return trashed

    async def permanently_delete_item(self, item_id: str, owner_id: str) -> None:
        if not ObjectId.is_valid(item_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

        item = await self.db["items"].find_one({
            "_id": ObjectId(item_id),
            "ownerId": ObjectId(owner_id),
            "deletedAt": {"$ne": None}
        })
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trashed item not found")

        # 1. Clean up attached files in GridFS
        file_cursor = self.db["file_assets"].find({"itemId": ObjectId(item_id), "ownerId": ObjectId(owner_id)})
        async for f in file_cursor:
            if f.get("gridFsId"):
                await self.storage.delete_file(f["gridFsId"])
            await self.db["file_assets"].delete_one({"_id": f["_id"]})

        # 2. Delete item document
        await self.db["items"].delete_one({"_id": ObjectId(item_id)})

    async def empty_trash(self, owner_id: str) -> int:
        owner_obj_id = ObjectId(owner_id)
        trashed_cursor = self.db["items"].find({
            "ownerId": owner_obj_id,
            "deletedAt": {"$ne": None}
        })

        count = 0
        async for item in trashed_cursor:
            item_id = item["_id"]
            # Purge files
            file_cursor = self.db["file_assets"].find({"itemId": item_id, "ownerId": owner_obj_id})
            async for f in file_cursor:
                if f.get("gridFsId"):
                    await self.storage.delete_file(f["gridFsId"])
                await self.db["file_assets"].delete_one({"_id": f["_id"]})
            await self.db["items"].delete_one({"_id": item_id})
            count += 1

        return count

