from fastapi import APIRouter, Depends, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, List, Optional

from app.security.dependencies import get_db, get_current_user
from app.schemas.reminder import (
    ReminderCreateRequest,
    ReminderUpdateRequest,
    ReminderResponse,
    UpcomingDeadlinesResponse,
)
from app.services import reminders_service

router = APIRouter(prefix="/reminders", tags=["Reminders & Life Dates"])


@router.get("", response_model=List[ReminderResponse], summary="List user's reminders")
async def list_reminders(
    status: Optional[str] = Query(None, description="Filter by status: pending, completed, snoozed, dismissed"),
    itemId: Optional[str] = Query(None, description="Filter by linked item ID"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await reminders_service.list_reminders(
        db=db,
        user_id=current_user["id"],
        status_filter=status,
        item_id_filter=itemId,
    )


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED, summary="Create a new reminder")
async def create_reminder(
    reminder_in: ReminderCreateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await reminders_service.create_reminder(
        db=db,
        user_id=current_user["id"],
        reminder_in=reminder_in,
    )


@router.get("/upcoming", response_model=UpcomingDeadlinesResponse, summary="Unified upcoming deadlines (reminders and document expiries)")
async def get_upcoming_deadlines(
    days: int = Query(30, ge=1, le=365, description="Number of days forward to inspect"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await reminders_service.get_upcoming_deadlines(
        db=db,
        user_id=current_user["id"],
        days=days,
    )


@router.get("/{id}", response_model=ReminderResponse, summary="Get a reminder by ID")
async def get_reminder(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await reminders_service.get_reminder(
        db=db,
        user_id=current_user["id"],
        reminder_id=id,
    )


@router.patch("/{id}", response_model=ReminderResponse, summary="Update a reminder")
async def update_reminder(
    id: str,
    update_in: ReminderUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await reminders_service.update_reminder(
        db=db,
        user_id=current_user["id"],
        reminder_id=id,
        update_in=update_in,
    )


@router.delete("/{id}", summary="Delete a reminder")
async def delete_reminder(
    id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    return await reminders_service.delete_reminder(
        db=db,
        user_id=current_user["id"],
        reminder_id=id,
    )

