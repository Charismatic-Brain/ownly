from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorGridFSBucket
from bson import ObjectId
from typing import AsyncGenerator, AsyncIterator, Optional, Dict, Any
import logging

from app.config import settings
from app.storage.crypto import ENCRYPTION_ID, decrypt_stream, encrypt_stream

logger = logging.getLogger("ownly.storage.gridfs")


async def _iter_raw(grid_out) -> AsyncIterator[bytes]:
    while True:
        chunk = await grid_out.readchunk()
        if not chunk:
            break
        yield chunk


class DecryptedGridOut:
    """Wraps a GridOut and exposes the same readchunk()/close() API, yielding plaintext."""

    def __init__(self, grid_out, master_key: bytes):
        self._grid_out = grid_out
        self._plain = decrypt_stream(_iter_raw(grid_out), master_key)
        self.metadata = getattr(grid_out, "metadata", None)

    async def readchunk(self) -> bytes:
        try:
            return await self._plain.__anext__()
        except StopAsyncIteration:
            return b""

    def close(self):
        return self._grid_out.close()


class GridFSStorage:
    """GridFS access with transparent AES-256-GCM encryption at rest.

    Files written before encryption was introduced have no `encryption` metadata and are
    returned as-is, so existing data keeps working until migrated
    (see scripts/encrypt_existing_files.py).
    """

    def __init__(self, db: AsyncIOMotorDatabase):
        self.bucket = AsyncIOMotorGridFSBucket(db)

    async def upload_stream(
        self,
        filename: str,
        stream: AsyncGenerator[bytes, None],
        metadata: Optional[Dict[str, Any]] = None
    ) -> ObjectId:
        """Encrypt a plaintext byte stream and store it in GridFS. Returns the ObjectId."""
        meta = dict(metadata or {})
        meta["encryption"] = ENCRYPTION_ID
        upload_stream = self.bucket.open_upload_stream(
            filename=filename,
            metadata=meta
        )
        try:
            async for chunk in encrypt_stream(stream, settings.file_master_key()):
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
        """Open a download stream. Returns an object with readchunk() yielding plaintext."""
        grid_out = await self.bucket.open_download_stream(gridfs_id)
        if (getattr(grid_out, "metadata", None) or {}).get("encryption") == ENCRYPTION_ID:
            return DecryptedGridOut(grid_out, settings.file_master_key())
        return grid_out

    async def open_raw_download_stream(self, gridfs_id: ObjectId):
        """Open the stored bytes without decrypting (used by the migration script)."""
        return await self.bucket.open_download_stream(gridfs_id)

    async def delete_file(self, gridfs_id: ObjectId) -> bool:
        """Delete file chunks and metadata from GridFS."""
        try:
            await self.bucket.delete(gridfs_id)
            return True
        except Exception as e:
            logger.warning("Could not delete GridFS file %s: %s", gridfs_id, e)
            return False
