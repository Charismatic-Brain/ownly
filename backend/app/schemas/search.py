from pydantic import BaseModel
from typing import List, Optional
from app.schemas.item import ItemResponse


class SearchResultResponse(BaseModel):
    items: List[ItemResponse]
    total: int
    page: int
    limit: int
    totalPages: int
    query: Optional[str] = None

