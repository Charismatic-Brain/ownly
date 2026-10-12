from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import math
import re
from app.repositories.item_repository import ItemRepository
from app.repositories.file_repository import FileRepository
from app.schemas.search import SearchResultResponse
from app.schemas.item import ItemResponse


class SearchService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.item_repo = ItemRepository(db)
        self.file_repo = FileRepository(db)

    async def search(
        self,
        owner_id: str,
        q: Optional[str] = None,
        kind: Optional[str] = None,
        collection_id: Optional[str] = None,
        tag: Optional[str] = None,
        favorite: Optional[bool] = None,
        expiring_soon: Optional[bool] = None,
        sort_by: str = "updatedAt",
        sort_order: str = "desc",
        page: int = 1,
        limit: int = 20
    ) -> SearchResultResponse:
        page = max(1, page)
        limit = max(1, min(100, limit))

        query: Dict[str, Any] = {
            "ownerId": ObjectId(owner_id),
            "deletedAt": None
        }

        # Text query over title, description, and custom fields values
        if q and q.strip():
            escaped = re.escape(q.strip())
            pattern = {"$regex": escaped, "$options": "i"}
            query["$or"] = [
                {"title": pattern},
                {"description": pattern},
                {"tags": pattern},
                {"content": pattern},
                {"url": pattern}
            ]

        if kind:
            query["kind"] = kind

        if collection_id is not None:
            if collection_id == "none" or collection_id == "":
                query["collectionId"] = None
            elif ObjectId.is_valid(collection_id):
                query["collectionId"] = ObjectId(collection_id)

        if tag and tag.strip():
            query["tags"] = tag.strip().lower()

        if favorite is not None:
            query["favorite"] = favorite

        if expiring_soon:
            now = datetime.now(timezone.utc)
            query["expiresAt"] = {"$gte": now, "$lte": now + timedelta(days=30)}

        # Sorting direction
        order_dir = -1 if sort_order.lower() == "desc" else 1
        valid_sort_fields = {"updatedAt", "createdAt", "title", "expiresAt"}
        sort_field = sort_by if sort_by in valid_sort_fields else "updatedAt"

        total = await self.db["items"].count_documents(query)
        skip = (page - 1) * limit

        cursor = self.db["items"].find(query).sort(sort_field, order_dir).skip(skip).limit(limit)

        results: List[ItemResponse] = []
        async for doc in cursor:
            d = ItemRepository.doc_to_dict(doc)
            if d.get("fileIds"):
                d["files"] = await self.file_repo.find_by_item_id_and_owner(d["id"], owner_id)
            else:
                d["files"] = []
            results.append(ItemResponse(**d))

        total_pages = math.ceil(total / limit) if total > 0 else 1

        return SearchResultResponse(
            items=results,
            total=total,
            page=page,
            limit=limit,
            totalPages=total_pages,
            query=q
        )

