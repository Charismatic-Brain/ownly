from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field


class AuditLogResponse(BaseModel):
    id: str
    actorUserId: str
    actorEmail: str | None = None
    action: str
    resourceType: str | None = None
    resourceId: str | None = None
    outcome: Literal["success", "denied", "error"] = "success"
    createdAt: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class AuditLogsListResponse(BaseModel):
    logs: list[AuditLogResponse]
    total: int
    page: int
    limit: int

