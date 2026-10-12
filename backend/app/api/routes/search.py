from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
from app.schemas.search import SearchResultResponse
from app.services.search_service import SearchService
from app.security.dependencies import get_db, get_current_user

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=SearchResultResponse, summary="Universal search across authorized vault items")
async def search_vault(
    q: Optional[str] = Query(None, description="Search keyword matching title, description, tags, or content"),
    kind: Optional[str] = Query(None, description="Filter by item kind (note, link, record, file)"),
    collectionId: Optional[str] = Query(None, description="Filter by collection ID"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    favorite: Optional[bool] = Query(None, description="Filter favorites"),
    expiringSoon: Optional[bool] = Query(None, description="Filter items expiring in the next 30 days"),
    sortBy: str = Query("updatedAt", description="Field to sort by (updatedAt, createdAt, title, expiresAt)"),
    sortOrder: str = Query("desc", description="Sort order: 'asc' or 'desc'"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = SearchService(db)
    return await service.search(
        owner_id=current_user["id"],
        q=q,
        kind=kind,
        collection_id=collectionId,
        tag=tag,
        favorite=favorite,
        expiring_soon=expiringSoon,
        sort_by=sortBy,
        sort_order=sortOrder,
        page=page,
        limit=limit
    )

