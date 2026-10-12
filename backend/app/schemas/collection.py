from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class CustomFieldDefinition(BaseModel):
    key: str = Field(..., min_length=1, max_length=50)
    label: str = Field(..., min_length=1, max_length=50)
    type: str = Field(default="text")  # text, number, date, url


class CollectionCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default="", max_length=500)
    icon: Optional[str] = Field(default="folder", max_length=50)
    parentId: Optional[str] = None
    fieldDefinitions: Optional[List[CustomFieldDefinition]] = Field(default_factory=list)


class CollectionUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field(None, max_length=50)
    parentId: Optional[str] = None
    fieldDefinitions: Optional[List[CustomFieldDefinition]] = None


class CollectionResponse(BaseModel):
    id: str
    ownerId: str
    name: str
    description: str
    icon: str
    parentId: Optional[str] = None
    fieldDefinitions: List[CustomFieldDefinition]
    itemCount: Optional[int] = 0
    createdAt: datetime
    updatedAt: datetime

