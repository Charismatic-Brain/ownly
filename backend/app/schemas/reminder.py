from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


ReminderStatus = Literal["pending", "completed", "snoozed", "dismissed"]
ReminderPriority = Literal["low", "medium", "high", "urgent"]
ReminderChannel = Literal["in_app", "email"]


class ReminderCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    itemId: Optional[str] = None
    description: Optional[str] = Field(default="", max_length=2000)
    remindAt: datetime
    priority: Optional[ReminderPriority] = "medium"
    channel: Optional[ReminderChannel] = "in_app"


class ReminderUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    itemId: Optional[str] = None
    description: Optional[str] = Field(None, max_length=2000)
    remindAt: Optional[datetime] = None
    status: Optional[ReminderStatus] = None
    priority: Optional[ReminderPriority] = None
    snoozedUntil: Optional[datetime] = None


class ReminderResponse(BaseModel):
    id: str
    ownerId: str
    itemId: Optional[str] = None
    itemTitle: Optional[str] = None
    itemKind: Optional[str] = None
    title: str
    description: str = ""
    remindAt: datetime
    status: ReminderStatus
    priority: ReminderPriority = "medium"
    channel: str = "in_app"
    snoozedUntil: Optional[datetime] = None
    isOverdue: bool = False
    createdAt: datetime
    updatedAt: datetime


class DeadlineItem(BaseModel):
    kind: Literal["reminder", "document_expiry"]
    id: str
    title: str
    description: str = ""
    deadlineDate: datetime
    daysUntil: int
    category: Literal["overdue", "today", "this_week", "upcoming"]
    priority: Optional[ReminderPriority] = "medium"
    status: Optional[ReminderStatus] = "pending"
    itemId: Optional[str] = None
    itemKind: Optional[str] = None


class UpcomingDeadlinesResponse(BaseModel):
    overdue: List[DeadlineItem]
    today: List[DeadlineItem]
    thisWeek: List[DeadlineItem]
    upcoming: List[DeadlineItem]
    totalActive: int

