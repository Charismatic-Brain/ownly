from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
import logging

logger = logging.getLogger("ownly.repositories.item")


class ItemRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["items"]

    @staticmethod
    def doc_to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB item document to JSON-compatible dict."""
        return {
            "id": str(doc["_id"]),
            "ownerId": str(doc["ownerId"]),
            "collectionId": str(doc["collectionId"]) if doc.get("collectionId") else None,
            "title": doc["title"],
            "kind": doc["kind"],
            "description": doc.get("description", ""),
            "tags": doc.get("tags", []),
            "customFields": doc.get("customFields", {}),
            "content": doc.get("content"),
            "url": doc.get("url"),
            "fileIds": [str(fid) for fid in doc.get("fileIds", [])],
            "favorite": doc.get("favorite", False),
            "eventDate": doc.get("eventDate"),
            "expiresAt": doc.get("expiresAt"),
            "createdAt": doc.get("createdAt"),
            "updatedAt": doc.get("updatedAt"),
            "deletedAt": doc.get("deletedAt"),
        }

    async def find_items(
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
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Search and paginate items for the authenticated user."""
        query: Dict[str, Any] = {"ownerId": ObjectId(owner_id)}

        if not include_deleted:
            query["deletedAt"] = None

        if collection_id is not None:
            if collection_id == "none" or collection_id == "":
                query["collectionId"] = None
            elif ObjectId.is_valid(collection_id):
                query["collectionId"] = ObjectId(collection_id)

        if kind:
            query["kind"] = kind

        if favorite is not None:
            query["favorite"] = favorite

        if tag:
            query["tags"] = tag.strip().lower()

        if search and search.strip():
            # Basic indexed regex match on title or description
            pattern = {"$regex": search.strip(), "$options": "i"}
            query["$or"] = [{"title": pattern}, {"description": pattern}]

        total = await self.collection.count_documents(query)
        skip = (page - 1) * limit

        cursor = self.collection.find(query).sort("updatedAt", -1).skip(skip).limit(limit)
        items = []
        async for doc in cursor:
            items.append(self.doc_to_dict(doc))

        return items, total

    async def find_by_id_and_owner(
        self,
        item_id: str,
        owner_id: str,
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Find a single item by ID and owner."""
        if not ObjectId.is_valid(item_id):
            return None

        query: Dict[str, Any] = {
            "_id": ObjectId(item_id),
            "ownerId": ObjectId(owner_id)
        }
        if not include_deleted:
            query["deletedAt"] = None

        doc = await self.collection.find_one(query)
        return self.doc_to_dict(doc) if doc else None

    async def create_item(
        self,
        owner_id: str,
        title: str,
        kind: str,
        description: str = "",
        collection_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        custom_fields: Optional[Dict[str, Any]] = None,
        content: Optional[str] = None,
        url: Optional[str] = None,
        favorite: bool = False,
        event_date: Optional[datetime] = None,
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Insert a new vault item."""
        now = datetime.now(timezone.utc)
        doc = {
            "ownerId": ObjectId(owner_id),
            "collectionId": ObjectId(collection_id) if collection_id and ObjectId.is_valid(collection_id) else None,
            "title": title.strip(),
            "kind": kind,
            "description": description.strip() if description else "",
            "tags": tags or [],
            "customFields": custom_fields or {},
            "content": content,
            "url": url,
            "fileIds": [],
            "favorite": favorite,
            "eventDate": event_date,
            "expiresAt": expires_at,
            "createdAt": now,
            "updatedAt": now,
            "deletedAt": None,
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return self.doc_to_dict(doc)

    async def update_item(
        self,
        item_id: str,
        owner_id: str,
        update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update an item's fields."""
        if not ObjectId.is_valid(item_id):
            return None

        fields: Dict[str, Any] = {}
        for key in ["title", "description", "tags", "customFields", "content", "url", "favorite", "eventDate", "expiresAt"]:
            if key in update_data and update_data[key] is not None:
                fields[key] = update_data[key]

        if "collectionId" in update_data:
            cid = update_data["collectionId"]
            fields["collectionId"] = ObjectId(cid) if cid and ObjectId.is_valid(cid) else None

        fields["updatedAt"] = datetime.now(timezone.utc)

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(item_id), "ownerId": ObjectId(owner_id), "deletedAt": None},
            {"$set": fields},
            return_document=True
        )
        return self.doc_to_dict(result) if result else None

    async def toggle_favorite(
        self,
        item_id: str,
        owner_id: str
    ) -> Optional[Dict[str, Any]]:
        """Toggle favorite state of an item."""
        item = await self.find_by_id_and_owner(item_id, owner_id)
        if not item:
            return None

        new_fav = not item["favorite"]
        return await self.update_item(item_id, owner_id, {"favorite": new_fav})

    async def soft_delete_item(
        self,
        item_id: str,
        owner_id: str
    ) -> bool:
        """Soft delete an item."""
        if not ObjectId.is_valid(item_id):
            return False

        result = await self.collection.update_one(
            {"_id": ObjectId(item_id), "ownerId": ObjectId(owner_id), "deletedAt": None},
            {"$set": {"deletedAt": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

    async def restore_item(
        self,
        item_id: str,
        owner_id: str
    ) -> Optional[Dict[str, Any]]:
        """Restore a soft-deleted item."""
        if not ObjectId.is_valid(item_id):
            return None

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(item_id), "ownerId": ObjectId(owner_id), "deletedAt": {"$ne": None}},
            {"$set": {"deletedAt": None, "updatedAt": datetime.now(timezone.utc)}},
            return_document=True
        )
        return self.doc_to_dict(result) if result else None

