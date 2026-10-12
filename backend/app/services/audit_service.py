from datetime import datetime, timezone
from typing import Any
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger("ownly.services.audit")

SENSITIVE_KEYS = {"password", "token", "access_token", "refresh_token", "secret", "authorization", "hash"}


def _sanitize_metadata(data: dict[str, Any] | None) -> dict[str, Any]:
    if not data:
        return {}
    sanitized: dict[str, Any] = {}
    for k, v in data.items():
        if k.lower() in SENSITIVE_KEYS:
            sanitized[k] = "[REDACTED]"
        elif isinstance(v, dict):
            sanitized[k] = _sanitize_metadata(v)
        elif isinstance(v, (str, int, float, bool)) or v is None:
            sanitized[k] = v
        else:
            sanitized[k] = str(v)
    return sanitized


async def log_audit_event(
    db: AsyncIOMotorDatabase,
    actor_user_id: str | ObjectId,
    action: str,
    resource_type: str | None = None,
    resource_id: str | ObjectId | None = None,
    outcome: str = "success",
    metadata: dict[str, Any] | None = None,
) -> str:
    """Log a security-relevant event to the audit_logs collection."""
    try:
        actor_oid = ObjectId(actor_user_id) if isinstance(actor_user_id, str) and ObjectId.is_valid(actor_user_id) else actor_user_id
        doc = {
            "actorUserId": actor_oid,
            "action": action,
            "resourceType": resource_type,
            "resourceId": str(resource_id) if resource_id else None,
            "outcome": outcome,
            "metadata": _sanitize_metadata(metadata),
            "createdAt": datetime.now(timezone.utc),
        }
        res = await db["audit_logs"].insert_one(doc)
        return str(res.inserted_id)
    except Exception as e:
        logger.error(f"Failed to record audit log: {e}")
        return ""


async def list_audit_logs(
    db: AsyncIOMotorDatabase,
    actor_user_id: str | ObjectId,
    action: str | None = None,
    outcome: str | None = None,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[dict], int]:
    """Retrieve paginated audit logs for a user."""
    actor_oid = ObjectId(actor_user_id) if isinstance(actor_user_id, str) and ObjectId.is_valid(actor_user_id) else actor_user_id
    query: dict[str, Any] = {"actorUserId": actor_oid}
    if action:
        query["action"] = action
    if outcome:
        query["outcome"] = outcome

    total = await db["audit_logs"].count_documents(query)
    cursor = (
        db["audit_logs"]
        .find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    logs: list[dict] = []
    # Lookup actor email once
    user_doc = await db["users"].find_one({"_id": actor_oid})
    actor_email = user_doc.get("email") if user_doc else None

    async for item in cursor:
        logs.append({
            "id": str(item["_id"]),
            "actorUserId": str(item["actorUserId"]),
            "actorEmail": actor_email,
            "action": item.get("action", "unknown"),
            "resourceType": item.get("resourceType"),
            "resourceId": item.get("resourceId"),
            "outcome": item.get("outcome", "success"),
            "createdAt": item.get("createdAt"),
            "metadata": item.get("metadata", {}),
        })

    return logs, total

