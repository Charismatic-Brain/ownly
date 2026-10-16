from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger("ownly.repositories.collection")


class CollectionRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["vault_collections"]

    @staticmethod
    def doc_to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB collection document to JSON-compatible dict."""
        return {
            "id": str(doc["_id"]),
            "ownerId": str(doc["ownerId"]),
            "name": doc["name"],
            "description": doc.get("description", ""),
            "icon": doc.get("icon", "folder"),
            "parentId": str(doc["parentId"]) if doc.get("parentId") else None,
            "fieldDefinitions": doc.get("fieldDefinitions", []),
            "createdAt": doc.get("createdAt"),
            "updatedAt": doc.get("updatedAt"),
            "deletedAt": doc.get("deletedAt"),
        }

    async def find_all_by_owner(
        self,
        owner_id: str,
        include_deleted: bool = False
    ) -> List[Dict[str, Any]]:
        """List all collections belonging to an owner."""
        query: Dict[str, Any] = {"ownerId": ObjectId(owner_id)}
        if not include_deleted:
            query["deletedAt"] = None

        cursor = self.collection.find(query).sort("name", 1)
        results = []
        async for doc in cursor:
            results.append(self.doc_to_dict(doc))
        return results

    async def find_by_id_and_owner(
        self,
        collection_id: str,
        owner_id: str,
        include_deleted: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Find a single collection by ID and owner."""
        if not ObjectId.is_valid(collection_id):
            return None
        query: Dict[str, Any] = {
            "_id": ObjectId(collection_id),
            "ownerId": ObjectId(owner_id),
        }
        if not include_deleted:
            query["deletedAt"] = None

        doc = await self.collection.find_one(query)
        return self.doc_to_dict(doc) if doc else None

    async def create_collection(
        self,
        owner_id: str,
        name: str,
        description: str = "",
        icon: str = "folder",
        parent_id: Optional[str] = None,
        field_definitions: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Insert a new collection."""
        now = datetime.now(timezone.utc)
        doc = {
            "ownerId": ObjectId(owner_id),
            "name": name.strip(),
            "description": description.strip() if description else "",
            "icon": icon.strip() if icon else "folder",
            "parentId": ObjectId(parent_id) if parent_id and ObjectId.is_valid(parent_id) else None,
            "fieldDefinitions": field_definitions or [],
            "createdAt": now,
            "updatedAt": now,
            "deletedAt": None,
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return self.doc_to_dict(doc)

    async def update_collection(
        self,
        collection_id: str,
        owner_id: str,
        update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update an existing collection."""
        if not ObjectId.is_valid(collection_id):
            return None

        update_fields: Dict[str, Any] = {}
        if "name" in update_data and update_data["name"] is not None:
            update_fields["name"] = update_data["name"].strip()
        if "description" in update_data and update_data["description"] is not None:
            update_fields["description"] = update_data["description"].strip()
        if "icon" in update_data and update_data["icon"] is not None:
            update_fields["icon"] = update_data["icon"].strip()
        if "parentId" in update_data:
            pid = update_data["parentId"]
            update_fields["parentId"] = ObjectId(pid) if pid and ObjectId.is_valid(pid) else None
        if "fieldDefinitions" in update_data and update_data["fieldDefinitions"] is not None:
            update_fields["fieldDefinitions"] = update_data["fieldDefinitions"]

        update_fields["updatedAt"] = datetime.now(timezone.utc)

        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(collection_id), "ownerId": ObjectId(owner_id), "deletedAt": None},
            {"$set": update_fields},
            return_document=True
        )
        return self.doc_to_dict(result) if result else None

    async def soft_delete_collection(
        self,
        collection_id: str,
        owner_id: str
    ) -> bool:
        """Soft delete a collection by setting deletedAt."""
        if not ObjectId.is_valid(collection_id):
            return False

        result = await self.collection.update_one(
            {"_id": ObjectId(collection_id), "ownerId": ObjectId(owner_id), "deletedAt": None},
            {"$set": {"deletedAt": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0

