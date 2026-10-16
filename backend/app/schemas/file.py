from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FileAssetResponse(BaseModel):
    id: str
    ownerId: str
    itemId: str
    originalName: str
    mimeType: str
    sizeBytes: int
    storage: str
    uploadedAt: datetime
    deletedAt: Optional[datetime] = None


class FileUploadResponse(BaseModel):
    file: FileAssetResponse
    itemId: str
    message: str = "File uploaded successfully"

