from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.schemas.item import ItemResponse


class KindBreakdown(BaseModel):
    kind: str
    count: int


class CollectionStat(BaseModel):
    id: str
    name: str
    icon: str
    count: int


class DashboardStatsResponse(BaseModel):
    totalItems: int
    totalCollections: int
    totalFiles: int
    totalFavorites: int
    expiringSoonCount: int
    breakdownByKind: List[KindBreakdown]
    topCollections: List[CollectionStat]
    upcomingExpiries: List[ItemResponse]
    recentItems: List[ItemResponse]

