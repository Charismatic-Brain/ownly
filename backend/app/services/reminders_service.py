from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status

from app.schemas.reminder import (
    ReminderCreateRequest,
    ReminderUpdateRequest,
    ReminderResponse,
    DeadlineItem,
    UpcomingDeadlinesResponse,
)


def _format_reminder(doc: Dict[str, Any], item_map: Dict[str, Dict[str, Any]] = None) -> ReminderResponse:
    now = datetime.now(timezone.utc)
    item_id_str = str(doc["itemId"]) if doc.get("itemId") else None
    item_info = (item_map or {}).get(item_id_str, {}) if item_id_str else {}

    remind_at = doc.get("remindAt")
    if remind_at and remind_at.tzinfo is None:
        remind_at = remind_at.replace(tzinfo=timezone.utc)

    snoozed_until = doc.get("snoozedUntil")
    if snoozed_until and snoozed_until.tzinfo is None:
        snoozed_until = snoozed_until.replace(tzinfo=timezone.utc)

    effective_due = snoozed_until or remind_at
    is_overdue = (
        doc.get("status") in ["pending", "snoozed"]
        and effective_due is not None
        and effective_due < now
    )

    created_at = doc.get("createdAt", now)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    updated_at = doc.get("updatedAt", now)
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)

    return ReminderResponse(
        id=str(doc["_id"]),
        ownerId=str(doc["ownerId"]),
        itemId=item_id_str,
        itemTitle=item_info.get("title"),
        itemKind=item_info.get("kind"),
        title=doc.get("title", ""),
        description=doc.get("description", ""),
        remindAt=remind_at,
        status=doc.get("status", "pending"),
        priority=doc.get("priority", "medium"),
        channel=doc.get("channel", "in_app"),
        snoozedUntil=snoozed_until,
        isOverdue=is_overdue,
        createdAt=created_at,
        updatedAt=updated_at,
    )


async def _get_item_map(db: AsyncIOMotorDatabase, item_ids: List[ObjectId]) -> Dict[str, Dict[str, Any]]:
    if not item_ids:
        return {}
    cursor = db["items"].find({"_id": {"$in": item_ids}}, {"_id": 1, "title": 1, "kind": 1})
    items = await cursor.to_list(length=len(item_ids))
    return {str(i["_id"]): {"title": i.get("title", ""), "kind": i.get("kind", "")} for i in items}


async def create_reminder(
    db: AsyncIOMotorDatabase,
    user_id: str,
    reminder_in: ReminderCreateRequest
) -> ReminderResponse:
    owner_oid = ObjectId(user_id)
    item_oid = None

    if reminder_in.itemId:
        if not ObjectId.is_valid(reminder_in.itemId):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid itemId format",
            )
        item_oid = ObjectId(reminder_in.itemId)
        item = await db["items"].find_one({"_id": item_oid, "ownerId": owner_oid, "deletedAt": None})
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked item not found in your vault",
            )

    remind_at = reminder_in.remindAt
    if remind_at.tzinfo is None:
        remind_at = remind_at.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    doc = {
        "ownerId": owner_oid,
        "itemId": item_oid,
        "title": reminder_in.title.strip(),
        "description": reminder_in.description.strip() if reminder_in.description else "",
        "remindAt": remind_at,
        "status": "pending",
        "priority": reminder_in.priority or "medium",
        "channel": reminder_in.channel or "in_app",
        "snoozedUntil": None,
        "createdAt": now,
        "updatedAt": now,
        "deletedAt": None,
    }

    result = await db["reminders"].insert_one(doc)
    doc["_id"] = result.inserted_id

    item_map = await _get_item_map(db, [item_oid]) if item_oid else {}
    return _format_reminder(doc, item_map)


async def list_reminders(
    db: AsyncIOMotorDatabase,
    user_id: str,
    status_filter: Optional[str] = None,
    item_id_filter: Optional[str] = None,
) -> List[ReminderResponse]:
    owner_oid = ObjectId(user_id)
    query: Dict[str, Any] = {"ownerId": owner_oid, "deletedAt": None}

    if status_filter:
        query["status"] = status_filter
    if item_id_filter:
        if ObjectId.is_valid(item_id_filter):
            query["itemId"] = ObjectId(item_id_filter)

    cursor = db["reminders"].find(query).sort("remindAt", 1)
    docs = await cursor.to_list(length=200)

    item_ids = [d["itemId"] for d in docs if d.get("itemId")]
    item_map = await _get_item_map(db, item_ids)

    return [_format_reminder(d, item_map) for d in docs]


async def get_reminder(
    db: AsyncIOMotorDatabase,
    user_id: str,
    reminder_id: str
) -> ReminderResponse:
    if not ObjectId.is_valid(reminder_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reminder ID format",
        )

    doc = await db["reminders"].find_one({
        "_id": ObjectId(reminder_id),
        "ownerId": ObjectId(user_id),
        "deletedAt": None,
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    item_map = {}
    if doc.get("itemId"):
        item_map = await _get_item_map(db, [doc["itemId"]])

    return _format_reminder(doc, item_map)


async def update_reminder(
    db: AsyncIOMotorDatabase,
    user_id: str,
    reminder_id: str,
    update_in: ReminderUpdateRequest
) -> ReminderResponse:
    if not ObjectId.is_valid(reminder_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reminder ID format",
        )

    owner_oid = ObjectId(user_id)
    reminder_oid = ObjectId(reminder_id)

    existing = await db["reminders"].find_one({
        "_id": reminder_oid,
        "ownerId": owner_oid,
        "deletedAt": None,
    })
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    update_fields: Dict[str, Any] = {"updatedAt": datetime.now(timezone.utc)}

    if update_in.title is not None:
        update_fields["title"] = update_in.title.strip()
    if update_in.description is not None:
        update_fields["description"] = update_in.description.strip()
    if update_in.status is not None:
        update_fields["status"] = update_in.status
    if update_in.priority is not None:
        update_fields["priority"] = update_in.priority
    if update_in.remindAt is not None:
        remind_at = update_in.remindAt
        if remind_at.tzinfo is None:
            remind_at = remind_at.replace(tzinfo=timezone.utc)
        update_fields["remindAt"] = remind_at
    if update_in.snoozedUntil is not None:
        snooze_at = update_in.snoozedUntil
        if snooze_at.tzinfo is None:
            snooze_at = snooze_at.replace(tzinfo=timezone.utc)
        update_fields["snoozedUntil"] = snooze_at
        update_fields["status"] = "snoozed"

    if update_in.itemId is not None:
        if update_in.itemId == "":
            update_fields["itemId"] = None
        else:
            if not ObjectId.is_valid(update_in.itemId):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid itemId format",
                )
            target_item = await db["items"].find_one({
                "_id": ObjectId(update_in.itemId),
                "ownerId": owner_oid,
                "deletedAt": None,
            })
            if not target_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Linked item not found in your vault",
                )
            update_fields["itemId"] = ObjectId(update_in.itemId)

    await db["reminders"].update_one(
        {"_id": reminder_oid, "ownerId": owner_oid},
        {"$set": update_fields}
    )

    updated_doc = await db["reminders"].find_one({"_id": reminder_oid})
    item_map = {}
    if updated_doc.get("itemId"):
        item_map = await _get_item_map(db, [updated_doc["itemId"]])

    return _format_reminder(updated_doc, item_map)


async def delete_reminder(
    db: AsyncIOMotorDatabase,
    user_id: str,
    reminder_id: str
) -> Dict[str, str]:
    if not ObjectId.is_valid(reminder_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reminder ID format",
        )

    owner_oid = ObjectId(user_id)
    res = await db["reminders"].delete_one({"_id": ObjectId(reminder_id), "ownerId": owner_oid})
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    return {"message": "Reminder deleted successfully"}


async def get_upcoming_deadlines(
    db: AsyncIOMotorDatabase,
    user_id: str,
    days: int = 30
) -> UpcomingDeadlinesResponse:
    owner_oid = ObjectId(user_id)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)
    window_end = today_start + timedelta(days=days)

    # 1. Fetch active reminders (pending or snoozed)
    reminder_cursor = db["reminders"].find({
        "ownerId": owner_oid,
        "deletedAt": None,
        "status": {"$in": ["pending", "snoozed"]},
    })
    reminder_docs = await reminder_cursor.to_list(length=300)

    item_ids = [d["itemId"] for d in reminder_docs if d.get("itemId")]
    item_map = await _get_item_map(db, item_ids)

    # 2. Fetch items expiring within window (or already expired)
    items_cursor = db["items"].find({
        "ownerId": owner_oid,
        "deletedAt": None,
        "expiresAt": {"$ne": None, "$lte": window_end},
    })
    item_docs = await items_cursor.to_list(length=300)

    deadline_items: List[DeadlineItem] = []

    # Process reminders
    for r in reminder_docs:
        due = r.get("snoozedUntil") or r.get("remindAt")
        if not due:
            continue
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

        diff = due - now
        days_until = int(diff.total_seconds() // 86400) if diff.total_seconds() >= 0 else int(diff.total_seconds() // 86400)

        if due < today_start:
            cat = "overdue"
        elif due < today_end:
            cat = "today"
        elif due <= week_end:
            cat = "this_week"
        else:
            cat = "upcoming"

        linked_item = item_map.get(str(r["itemId"])) if r.get("itemId") else None

        deadline_items.append(
            DeadlineItem(
                kind="reminder",
                id=str(r["_id"]),
                title=r.get("title", ""),
                description=r.get("description", ""),
                deadlineDate=due,
                daysUntil=days_until,
                category=cat,
                priority=r.get("priority", "medium"),
                status=r.get("status", "pending"),
                itemId=str(r["itemId"]) if r.get("itemId") else None,
                itemKind=linked_item.get("kind") if linked_item else None,
            )
        )

    # Process document expiries
    for it in item_docs:
        exp = it.get("expiresAt")
        if not exp:
            continue
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)

        diff = exp - now
        days_until = int(diff.total_seconds() // 86400) if diff.total_seconds() >= 0 else int(diff.total_seconds() // 86400)

        if exp < today_start:
            cat = "overdue"
        elif exp < today_end:
            cat = "today"
        elif exp <= week_end:
            cat = "this_week"
        else:
            cat = "upcoming"

        deadline_items.append(
            DeadlineItem(
                kind="document_expiry",
                id=str(it["_id"]),
                title=f"Expiry: {it.get('title', 'Document')}",
                description=it.get("description", "") or f"Document kind: {it.get('kind')}",
                deadlineDate=exp,
                daysUntil=days_until,
                category=cat,
                priority="high" if cat in ["overdue", "today"] else "medium",
                status="pending",
                itemId=str(it["_id"]),
                itemKind=it.get("kind"),
            )
        )

    # Group and sort
    overdue = sorted([d for d in deadline_items if d.category == "overdue"], key=lambda x: x.deadlineDate)
    today = sorted([d for d in deadline_items if d.category == "today"], key=lambda x: x.deadlineDate)
    this_week = sorted([d for d in deadline_items if d.category == "this_week"], key=lambda x: x.deadlineDate)
    upcoming = sorted([d for d in deadline_items if d.category == "upcoming"], key=lambda x: x.deadlineDate)

    total_active = len(overdue) + len(today) + len(this_week) + len(upcoming)

    return UpcomingDeadlinesResponse(
        overdue=overdue,
        today=today,
        thisWeek=this_week,
        upcoming=upcoming,
        totalActive=total_active,
    )

