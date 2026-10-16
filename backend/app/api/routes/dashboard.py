from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard_service import DashboardService
from app.security.dependencies import get_db, get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse, summary="Get aggregated dashboard stats and metrics")
async def get_dashboard_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    service = DashboardService(db)
    return await service.get_dashboard_stats(current_user["id"])

