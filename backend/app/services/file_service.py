from fastapi import HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import Optional, Dict, Any, AsyncGenerator
import hashlib
import urllib.parse
from app.config import settings
from app.storage.gridfs import GridFSStorage
from app.repositories.file_repository import FileRepository
from app.repositories.item_repository import ItemRepository
from app.schemas.file import FileAssetResponse, FileUploadResponse
import logging

logger = logging.getLogger("ownly.services.file")


class FileService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.storage = GridFSStorage(db)
        self.file_repo = FileRepository(db)
        self.item_repo = ItemRepository(db)

    async def upload_file(
        self,
        file: UploadFile,
        owner_id: str,
        item_id: Optional[str] = None,
        title: Optional[str] = None,
        collection_id: Optional[str] = None
    ) -> FileUploadResponse:
        # 1. Validate MIME type
        content_type = file.content_type or "application/octet-stream"
        allowed_types = settings.allowed_mime_types
        # Allow wildcards or exact match (e.g. image/* or application/pdf)
        is_allowed = any(
            t == content_type or (t.endswith("/*") and content_type.startswith(t[:-1]))
            for t in allowed_types
        )
        if not is_allowed and "*/*" not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File type '{content_type}' is not allowed. Supported types: {settings.ALLOWED_UPLOAD_TYPES}"
            )

        # 2. Check or create target item
        if item_id:
            target_item = await self.item_repo.find_by_id_and_owner(item_id, owner_id)
            if not target_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Target vault item not found or does not belong to you."
                )
        else:
            # Create a new vault item of kind 'file'
            display_title = title.strip() if title and title.strip() else (file.filename or "Uploaded Document")
            target_item = await self.item_repo.create_item(
                owner_id=owner_id,
                title=display_title,
                kind="file",
                collection_id=collection_id,
                description=f"File asset: {file.filename or 'Document'}"
            )
            item_id = target_item["id"]

        # 3. Stream chunks into GridFS with size & sha256 tracking
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        total_size = 0
        sha256_hasher = hashlib.sha256()

        async def file_chunk_generator() -> AsyncGenerator[bytes, None]:
            nonlocal total_size
            chunk_size = 64 * 1024  # 64 KB
            while True:
                chunk = await file.read(chunk_size)
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
                    )
                sha256_hasher.update(chunk)
                yield chunk

        grid_fs_id = None
        try:
            grid_fs_id = await self.storage.upload_stream(
                filename=file.filename or "file.bin",
                stream=file_chunk_generator(),
                metadata={"ownerId": owner_id, "itemId": item_id, "mimeType": content_type}
            )

            # 4. Save file metadata in file_assets
            asset_doc = await self.file_repo.create_file_asset(
                owner_id=owner_id,
                item_id=item_id,
                original_name=file.filename or "document.bin",
                mime_type=content_type,
                size_bytes=total_size,
                grid_fs_id=grid_fs_id,
                sha256=sha256_hasher.hexdigest()
            )

            # 5. Link file to target item's fileIds
            await self.db["items"].update_one(
                {"_id": ObjectId(item_id)},
                {"$addToSet": {"fileIds": ObjectId(asset_doc["id"])}}
            )

            return FileUploadResponse(
                file=FileAssetResponse(**asset_doc),
                itemId=item_id,
                message="File uploaded and stored in GridFS successfully."
            )
        except Exception as e:
            # Partial failure cleanup: remove GridFS file if created
            if grid_fs_id:
                await self.storage.delete_file(grid_fs_id)
            logger.error("Upload failed with error: %s", e)
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process and store file upload: {str(e)}"
            )

    async def stream_download(
        self,
        file_id: str,
        owner_id: str,
        preview: bool = False
    ) -> StreamingResponse:
        # Check ownership and metadata
        file_doc = await self.file_repo.find_by_id_and_owner(file_id, owner_id)
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied."
            )

        grid_fs_id = ObjectId(file_doc["gridFsId"])
        try:
            grid_out = await self.storage.open_download_stream(grid_fs_id)
        except Exception as e:
            logger.error("Could not open GridFS stream for %s: %s", grid_fs_id, e)
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File storage content is missing or corrupted."
            )

        async def iter_chunks():
            while True:
                chunk = await grid_out.readchunk()
                if not chunk:
                    break
                yield chunk

        # Safe Content-Disposition header
        disposition_type = "inline" if preview else "attachment"
        safe_filename = urllib.parse.quote(file_doc["originalName"])
        content_disposition = f"{disposition_type}; filename*=UTF-8''{safe_filename}"

        headers = {
            "Content-Disposition": content_disposition,
            "Content-Length": str(file_doc["sizeBytes"]),
            "X-Content-Type-Options": "nosniff",
        }

        return StreamingResponse(
            iter_chunks(),
            media_type=file_doc["mimeType"],
            headers=headers
        )

    async def get_file_metadata(self, file_id: str, owner_id: str) -> FileAssetResponse:
        doc = await self.file_repo.find_by_id_and_owner(file_id, owner_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied."
            )
        return FileAssetResponse(**doc)

    async def delete_file(self, file_id: str, owner_id: str) -> None:
        doc = await self.file_repo.find_by_id_and_owner(file_id, owner_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found or access denied."
            )

        # 1. Delete GridFS binary chunks
        if doc.get("gridFsId"):
            await self.storage.delete_file(ObjectId(doc["gridFsId"]))

        # 2. Unlink from item
        await self.db["items"].update_one(
            {"_id": ObjectId(doc["itemId"])},
            {"$pull": {"fileIds": ObjectId(file_id)}}
        )

        # 3. Delete file_assets record
        await self.file_repo.delete_file_asset(file_id, owner_id)

