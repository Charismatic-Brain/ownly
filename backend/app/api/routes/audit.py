from typing import Dict, Any
from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongodb import get_database
from app.security.dependencies import get_current_user
from app.schemas.audit import AuditLogsListResponse, AuditLogResponse
from app.services import audit_service

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=AuditLogsListResponse)
async def list_audit_logs_endpoint(
    action: str | None = Query(None, description="Filter by action name"),
    outcome: str | None = Query(None, description="Filter by outcome"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """List paginated audit logs for the authenticated user."""
    logs, total = await audit_service.list_audit_logs(
        db,
        actor_user_id=current_user["id"],
        action=action,
        outcome=outcome,
        page=page,
        limit=limit,
    )
    return AuditLogsListResponse(
        logs=[AuditLogResponse(**log) for log in logs],
        total=total,
        page=page,
        limit=limit,
    )

