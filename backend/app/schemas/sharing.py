from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field, EmailStr
from app.schemas.file import FileAssetResponse


ResourceType = Literal["item", "album"]
SharePermission = Literal["view", "edit"]


class ShareCreateRequest(BaseModel):
    resourceType: ResourceType
    resourceId: str
    recipientEmail: EmailStr
    permissions: SharePermission = "view"
    expiresAt: datetime | None = None


class ShareResponse(BaseModel):
    id: str
    ownerId: str
    ownerEmail: str | None = None
    resourceType: ResourceType
    resourceId: str
    resourceTitle: str | None = None
    recipientUserId: str
    recipientEmail: str | None = None
    permissions: SharePermission
    expiresAt: datetime | None = None
    revokedAt: datetime | None = None
    createdAt: datetime
    isActive: bool = True


class SharedItemResponse(BaseModel):
    id: str
    ownerId: str
    ownerEmail: str | None = None
    collectionId: str | None = None
    title: str
    kind: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    customFields: dict[str, Any] = Field(default_factory=dict)
    content: str | None = None
    url: str | None = None
    fileIds: list[str] = Field(default_factory=list)
    files: list[FileAssetResponse] = Field(default_factory=list)
    permissions: SharePermission = "view"
    expiresAt: datetime | None = None
    createdAt: datetime
    updatedAt: datetime

