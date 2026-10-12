from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import logging

logger = logging.getLogger("ownly.repositories.user")


class UserRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["users"]

    @staticmethod
    def doc_to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
        """Convert MongoDB document to JSON-compatible dict."""
        return {
            "id": str(doc["_id"]),
            "email": doc["email"],
            "displayName": doc.get("displayName", ""),
            "settings": doc.get("settings", {"timezone": "Asia/Kolkata", "theme": "system"}),
            "createdAt": doc.get("createdAt"),
            "updatedAt": doc.get("updatedAt"),
        }

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by normalized lowercase email."""
        return await self.collection.find_one({"email": email.strip().lower()})

    async def find_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Find user by string ObjectId."""
        if not ObjectId.is_valid(user_id):
            return None
        return await self.collection.find_one({"_id": ObjectId(user_id)})

    async def create_user(
        self,
        email: str,
        password_hash: str,
        display_name: str
    ) -> Dict[str, Any]:
        """Insert a new user document."""
        now = datetime.now(timezone.utc)
        doc = {
            "email": email.strip().lower(),
            "passwordHash": password_hash,
            "displayName": display_name.strip(),
            "createdAt": now,
            "updatedAt": now,
            "settings": {
                "timezone": "Asia/Kolkata",
                "theme": "system"
            }
        }
        result = await self.collection.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

