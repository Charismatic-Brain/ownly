from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Dict, Any
from app.schemas.collection import (
    CollectionCreateRequest,
    CollectionUpdateRequest,
    CollectionResponse
)
from app.services.collection_service import CollectionService
from app.security.dependencies import get_db, get_current_user

router = APIRouter(prefix="/collections", tags=["Collections"])


@router.get("", response_model=List[CollectionResponse], summary="List all collections for current user")
async def list_collections(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = CollectionService(db)
    return await service.list_collections(current_user["id"])


@router.post("", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED, summary="Create a new collection")
async def create_collection(
    req: CollectionCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = CollectionService(db)
    return await service.create_collection(req, current_user["id"])


@router.get("/{collection_id}", response_model=CollectionResponse, summary="Get collection details")
async def get_collection(
    collection_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = CollectionService(db)
    return await service.get_collection(collection_id, current_user["id"])


@router.patch("/{collection_id}", response_model=CollectionResponse, summary="Update collection")
async def update_collection(
    collection_id: str,
    req: CollectionUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = CollectionService(db)
    return await service.update_collection(collection_id, req, current_user["id"])


@router.delete("/{collection_id}", summary="Delete collection")
async def delete_collection(
    collection_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = CollectionService(db)
    await service.delete_collection(collection_id, current_user["id"])
    return {"message": "Collection deleted successfully."}

