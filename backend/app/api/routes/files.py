from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, Dict, Any
from app.schemas.file import FileAssetResponse, FileUploadResponse
from app.services.file_service import FileService
from app.security.dependencies import get_db, get_current_user

router = APIRouter(prefix="", tags=["File Vault"])


@router.post(
    "/files/upload",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file and create a new vault file item"
)
async def upload_direct_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    collectionId: Optional[str] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = FileService(db)
    return await service.upload_file(
        file=file,
        owner_id=current_user["id"],
        title=title,
        collection_id=collectionId
    )


@router.post(
    "/items/{item_id}/files",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and attach a file to an existing item"
)
async def upload_item_attachment(
    item_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = FileService(db)
    return await service.upload_file(
        file=file,
        owner_id=current_user["id"],
        item_id=item_id
    )


@router.get(
    "/files/{file_id}/download",
    summary="Stream and download/preview an authorized file"
)
async def download_file(
    file_id: str,
    preview: bool = Query(False, description="Preview inline if true, else download as attachment"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> StreamingResponse:
    service = FileService(db)
    return await service.stream_download(
        file_id=file_id,
        owner_id=current_user["id"],
        preview=preview
    )


@router.get(
    "/files/{file_id}",
    response_model=FileAssetResponse,
    summary="Get file asset metadata"
)
async def get_file_metadata(
    file_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = FileService(db)
    return await service.get_file_metadata(file_id=file_id, owner_id=current_user["id"])


@router.delete(
    "/files/{file_id}",
    summary="Delete a file asset and GridFS file content"
)
async def delete_file(
    file_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = FileService(db)
    await service.delete_file(file_id=file_id, owner_id=current_user["id"])
    return {"message": "File deleted successfully from storage."}

