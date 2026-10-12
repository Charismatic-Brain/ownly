from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from bson import ObjectId
from typing import AsyncGenerator, Optional, Dict, Any
import logging

logger = logging.getLogger("ownly.storage.gridfs")


class GridFSStorage:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.bucket = AsyncIOMotorGridFSBucket(db)

    async def upload_stream(
        self,
        filename: str,
        stream: AsyncGenerator[bytes, None],
        metadata: Optional[Dict[str, Any]] = None
    ) -> ObjectId:
        """Upload stream bytes to GridFS and return ObjectId."""
        upload_stream = self.bucket.open_upload_stream(
            filename=filename,
            metadata=metadata or {}
        )
        try:
            async for chunk in stream:
                await upload_stream.write(chunk)
            await upload_stream.close()
            return upload_stream._id
        except Exception as e:
            # Cleanup partially written stream on failure
            try:
                await upload_stream.abort()
            except Exception:
                pass
            logger.error("Failed to upload stream to GridFS: %s", e)
            raise

    async def open_download_stream(self, gridfs_id: ObjectId):
        """Open a download stream for reading chunks from GridFS."""
        return await self.bucket.open_download_stream(gridfs_id)

    async def delete_file(self, gridfs_id: ObjectId) -> bool:
        """Delete file chunks and metadata from GridFS."""
        try:
            await self.bucket.delete(gridfs_id)
            return True
        except Exception as e:
            logger.warning("Could not delete GridFS file %s: %s", gridfs_id, e)
            return False

