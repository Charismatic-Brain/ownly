from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger("ownly.repositories.file")


class FileRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["file_assets"]

    @staticmethod
    def doc_to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB file_asset document to JSON-compatible dict."""
        return {
            "id": str(doc["_id"]),
            "ownerId": str(doc["ownerId"]),
            "itemId": str(doc["itemId"]),
            "originalName": doc.get("originalName", "unnamed_file"),
            "mimeType": doc.get("mimeType", "application/octet-stream"),
            "sizeBytes": doc.get("sizeBytes", 0),
            "storage": doc.get("storage", "gridfs"),
            "gridFsId": str(doc["gridFsId"]) if doc.get("gridFsId") else None,
            "sha256": doc.get("sha256"),
            "scanStatus": doc.get("scanStatus", "pending"),
            "uploadedAt": doc.get("uploadedAt"),
            "deletedAt": doc.get("deletedAt"),
        }

    async def create_file_asset(
        self,
        owner_id: str,
        item_id: str,
        original_name: str,
        mime_type: str,
        size_bytes: int,
        grid_fs_id: ObjectId,
        sha256: Optional[str] = None
    ) -> Dict[str, Any]:
        """Insert metadata record for uploaded file."""
        now = datetime.now(timezone.utc)
        doc = {
            "ownerId": ObjectId(owner_id),
            "itemId": ObjectId(item_id),
            "originalName": original_name,
            "mimeType": mime_type,
            "sizeBytes": size_bytes,
            "storage": "gridfs",
            "gridFsId": grid_fs_id,
            "sha256": sha256,
            "scanStatus": "clean",
            "uploadedAt": now,
            "deletedAt": None,
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return self.doc_to_dict(doc)

    async def find_by_id_and_owner(
        self,
        file_id: str,
        owner_id: str,
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Retrieve file asset by ID and owner."""
        if not ObjectId.is_valid(file_id):
            return None
        query: Dict[str, Any] = {
            "_id": ObjectId(file_id),
            "ownerId": ObjectId(owner_id)
        }
        if not include_deleted:
            query["deletedAt"] = None

        doc = await self.collection.find_one(query)
        return self.doc_to_dict(doc) if doc else None

    async def find_by_item_id_and_owner(
        self,
        item_id: str,
        owner_id: str
    ) -> List[Dict[str, Any]]:
        """Retrieve all file assets attached to an item."""
        if not ObjectId.is_valid(item_id):
            return []
        cursor = self.collection.find({
            "itemId": ObjectId(item_id),
            "ownerId": ObjectId(owner_id),
            "deletedAt": None
        }).sort("uploadedAt", -1)

        results = []
        async for doc in cursor:
            results.append(self.doc_to_dict(doc))
        return results

    async def delete_file_asset(
        self,
        file_id: str,
        owner_id: str
    ) -> Optional[Dict[str, Any]]:
        """Remove file asset record."""
        if not ObjectId.is_valid(file_id):
            return None
        doc = await self.collection.find_one_and_delete({
            "_id": ObjectId(file_id),
            "ownerId": ObjectId(owner_id)
        })
        return self.doc_to_dict(doc) if doc else None

