from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime


ItemKind = Literal["note", "link", "record", "file"]


class ItemCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    kind: ItemKind
    description: Optional[str] = Field(default="", max_length=2000)
    collectionId: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    customFields: Optional[Dict[str, Any]] = Field(default_factory=dict)
    content: Optional[str] = Field(default=None, max_length=50000)
    url: Optional[str] = Field(default=None, max_length=2000)
    favorite: Optional[bool] = False
    eventDate: Optional[datetime] = None
    expiresAt: Optional[datetime] = None

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v: Optional[List[str]]) -> List[str]:
        if not v:
            return []
        cleaned = []
        for tag in v:
            t = tag.strip().lower()
            if t and t not in cleaned:
                cleaned.append(t)
        return cleaned


class ItemUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    collectionId: Optional[str] = None
    tags: Optional[List[str]] = None
    customFields: Optional[Dict[str, Any]] = None
    content: Optional[str] = Field(None, max_length=50000)
    url: Optional[str] = Field(None, max_length=2000)
    favorite: Optional[bool] = None
    eventDate: Optional[datetime] = None
    expiresAt: Optional[datetime] = None

    @field_validator("tags")
    @classmethod
    def clean_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        cleaned = []
        for tag in v:
            t = tag.strip().lower()
            if t and t not in cleaned:
                cleaned.append(t)
        return cleaned


from app.schemas.file import FileAssetResponse


class ItemResponse(BaseModel):
    id: str
    ownerId: str
    collectionId: Optional[str] = None
    title: str
    kind: ItemKind
    description: str
    tags: List[str]
    customFields: Dict[str, Any]
    content: Optional[str] = None
    url: Optional[str] = None
    fileIds: List[str] = Field(default_factory=list)
    files: List[FileAssetResponse] = Field(default_factory=list)
    favorite: bool
    eventDate: Optional[datetime] = None
    expiresAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    deletedAt: Optional[datetime] = None


class ItemListResponse(BaseModel):
    items: List[ItemResponse]
    total: int
    page: int
    limit: int
    totalPages: int

