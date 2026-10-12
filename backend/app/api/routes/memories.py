from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.security.dependencies import get_db, get_current_user
from app.schemas.memories import (
    AlbumCreateRequest,
    AlbumUpdateRequest,
    AlbumResponse,
    MediaAssetResponse,
    TimelineResponse,
)
from app.services import memories_service

router = APIRouter(prefix="", tags=["Memories & Media Albums"])


# ---------------------------------------------------------
# Albums Endpoints
# ---------------------------------------------------------

@router.get("/albums", response_model=List[AlbumResponse], summary="List user's albums")
async def list_albums(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await memories_service.list_albums(db=db, user_id=current_user["id"])


@router.post("/albums", response_model=AlbumResponse, status_code=status.HTTP_201_CREATED, summary="Create an album")
async def create_album(
    album_in: AlbumCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await memories_service.create_album(
        db=db,
        user_id=current_user["id"],
        album_in=album_in,
    )


@router.get("/albums/{id}", response_model=AlbumResponse, summary="Get album details and media assets")
async def get_album(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await memories_service.get_album(
        db=db,
        user_id=current_user["id"],
        album_id=id,
    )


@router.patch("/albums/{id}", response_model=AlbumResponse, summary="Update album metadata")
async def update_album(
    id: str,
    album_in: AlbumUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await memories_service.update_album(
        db=db,
        user_id=current_user["id"],
        album_id=id,
        album_in=album_in,
    )


@router.delete("/albums/{id}", summary="Delete an album and its media assets")
async def delete_album(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await memories_service.delete_album(
        db=db,
        user_id=current_user["id"],
        album_id=id,
    )


# ---------------------------------------------------------
# Media Upload & Timeline Endpoints
# ---------------------------------------------------------

@router.post(
    "/albums/{id}/media",
    response_model=MediaAssetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload photo or video to an album"
)
async def upload_media_to_album(
    id: str,
    file: UploadFile = File(...),
    caption: str = Form(""),
    takenAt: Optional[datetime] = Form(None),
    tags: Optional[str] = Form(""),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()] if tags else []
    return await memories_service.upload_media_to_album(
        db=db,
        user_id=current_user["id"],
        album_id=id,
        file=file,
        caption=caption,
        taken_at=takenAt,
        tags=tag_list,
    )


@router.post(
    "/media/upload",
    response_model=MediaAssetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload photo or video directly (optional album)"
)
async def upload_media_direct(
    file: UploadFile = File(...),
    albumId: Optional[str] = Form(None),
    caption: str = Form(""),
    takenAt: Optional[datetime] = Form(None),
    tags: Optional[str] = Form(""),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    tag_list = [t.strip().lower() for t in tags.split(",") if t.strip()] if tags else []
    return await memories_service.upload_media_to_album(
        db=db,
        user_id=current_user["id"],
        album_id=albumId if albumId else None,
        file=file,
        caption=caption,
        taken_at=takenAt,
        tags=tag_list,
    )


@router.get("/media", response_model=TimelineResponse, summary="Timeline view of all media assets")
async def get_media_timeline(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await memories_service.get_media_timeline(
        db=db,
        user_id=current_user["id"],
    )


@router.get("/media/{id}/preview", summary="Preview photo/video in browser")
async def preview_media(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    stream, filename, mime_type = await memories_service.get_media_stream(
        db=db,
        user_id=current_user["id"],
        media_id=id,
    )

    async def content_generator():
        while True:
            chunk = await stream.readchunk()
            if not chunk:
                break
            yield chunk

    headers = {
        "Content-Disposition": f'inline; filename="{filename}"',
        "Content-Type": mime_type,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
    }
    return StreamingResponse(content_generator(), media_type=mime_type, headers=headers)


@router.get("/media/{id}/download", summary="Download photo/video file")
async def download_media(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    stream, filename, mime_type = await memories_service.get_media_stream(
        db=db,
        user_id=current_user["id"],
        media_id=id,
    )

    async def content_generator():
        while True:
            chunk = await stream.readchunk()
            if not chunk:
                break
            yield chunk

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": mime_type,
        "X-Content-Type-Options": "nosniff",
    }
    return StreamingResponse(content_generator(), media_type=mime_type, headers=headers)


@router.delete("/media/{id}", summary="Delete media asset from album and GridFS")
async def delete_media(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await memories_service.delete_media(
        db=db,
        user_id=current_user["id"],
        media_id=id,
    )

