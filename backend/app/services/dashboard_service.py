from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from app.repositories.item_repository import ItemRepository
from app.repositories.collection_repository import CollectionRepository
from app.repositories.file_repository import FileRepository
from app.schemas.dashboard import (
    DashboardStatsResponse,
    KindBreakdown,
    CollectionStat
)
from app.schemas.item import ItemResponse


class DashboardService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.item_repo = ItemRepository(db)
        self.col_repo = CollectionRepository(db)
        self.file_repo = FileRepository(db)

    async def get_dashboard_stats(self, owner_id: str) -> DashboardStatsResponse:
        owner_obj_id = ObjectId(owner_id)
        now = datetime.now(timezone.utc)
        thirty_days_later = now + timedelta(days=30)

        # 1. Pipeline for kind breakdown & total active items
        pipeline_kind = [
            {"$match": {"ownerId": owner_obj_id, "deletedAt": None}},
            {"$group": {"_id": "$kind", "count": {"$sum": 1}}}
        ]
        breakdown: List[KindBreakdown] = []
        total_items = 0
        async for doc in self.db["items"].aggregate(pipeline_kind):
            k = doc["_id"] or "other"
            c = doc["count"]
            breakdown.append(KindBreakdown(kind=k, count=c))
            total_items += c

        # 2. Count total collections
        total_collections = await self.db["vault_collections"].count_documents({
            "ownerId": owner_obj_id,
            "deletedAt": None
        })

        # 3. Count total files stored
        total_files = await self.db["file_assets"].count_documents({
            "ownerId": owner_obj_id,
            "deletedAt": None
        })

        # 4. Count favorites
        total_favorites = await self.db["items"].count_documents({
            "ownerId": owner_obj_id,
            "deletedAt": None,
            "favorite": True
        })

        # 5. Upcoming expiries (within 30 days)
        cursor_expiring = self.db["items"].find({
            "ownerId": owner_obj_id,
            "deletedAt": None,
            "expiresAt": {"$gte": now, "$lte": thirty_days_later}
        }).sort("expiresAt", 1).limit(5)

        upcoming_expiries_items: List[ItemResponse] = []
        async for doc in cursor_expiring:
            d = ItemRepository.doc_to_dict(doc)
            d["files"] = await self.file_repo.find_by_item_id_and_owner(d["id"], owner_id)
            upcoming_expiries_items.append(ItemResponse(**d))

        expiring_soon_count = await self.db["items"].count_documents({
            "ownerId": owner_obj_id,
            "deletedAt": None,
            "expiresAt": {"$gte": now, "$lte": thirty_days_later}
        })

        # 6. Recent items (limit 5)
        cursor_recent = self.db["items"].find({
            "ownerId": owner_obj_id,
            "deletedAt": None
        }).sort("updatedAt", -1).limit(5)

        recent_items: List[ItemResponse] = []
        async for doc in cursor_recent:
            d = ItemRepository.doc_to_dict(doc)
            d["files"] = await self.file_repo.find_by_item_id_and_owner(d["id"], owner_id)
            recent_items.append(ItemResponse(**d))

        # 7. Top collections with item count
        pipeline_cols = [
            {"$match": {"ownerId": owner_obj_id, "deletedAt": None, "collectionId": {"$ne": None}}},
            {"$group": {"_id": "$collectionId", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        top_collections: List[CollectionStat] = []
        async for group in self.db["items"].aggregate(pipeline_cols):
            col_id = str(group["_id"])
            col_doc = await self.col_repo.find_by_id_and_owner(col_id, owner_id)
            if col_doc:
                top_collections.append(CollectionStat(
                    id=col_id,
                    name=col_doc["name"],
                    icon=col_doc.get("icon", "folder"),
                    count=group["count"]
                ))

        return DashboardStatsResponse(
            totalItems=total_items,
            totalCollections=total_collections,
            totalFiles=total_files,
            totalFavorites=total_favorites,
            expiringSoonCount=expiring_soon_count,
            breakdownByKind=breakdown,
            topCollections=top_collections,
            upcomingExpiries=upcoming_expiries_items,
            recentItems=recent_items
        )

