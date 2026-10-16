from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime


class AlbumCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=2000)
    eventDate: Optional[datetime] = None
    tags: Optional[List[str]] = Field(default_factory=list)

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


class AlbumUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    eventDate: Optional[datetime] = None
    tags: Optional[List[str]] = None
    coverMediaId: Optional[str] = None

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


class MediaAssetResponse(BaseModel):
    id: str
    ownerId: str
    albumId: Optional[str] = None
    albumTitle: Optional[str] = None
    originalName: str
    mimeType: str
    sizeBytes: int
    caption: str = ""
    takenAt: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    createdAt: datetime
    previewUrl: str
    downloadUrl: str


class AlbumResponse(BaseModel):
    id: str
    ownerId: str
    title: str
    description: str = ""
    eventDate: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    coverMediaId: Optional[str] = None
    mediaCount: int = 0
    media: Optional[List[MediaAssetResponse]] = None
    createdAt: datetime
    updatedAt: datetime


class MediaUpdateRequest(BaseModel):
    caption: Optional[str] = Field(None, max_length=1000)
    takenAt: Optional[datetime] = None
    tags: Optional[List[str]] = None
    albumId: Optional[str] = None


class TimelineGroup(BaseModel):
    period: str  # e.g. "October 2026" or "2026-10"
    items: List[MediaAssetResponse]


class TimelineResponse(BaseModel):
    groups: List[TimelineGroup]
    totalMedia: int

