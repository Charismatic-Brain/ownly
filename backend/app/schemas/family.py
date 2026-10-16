from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, EmailStr


FamilyRole = Literal["admin", "member"]
FamilyMemberStatus = Literal["pending", "accepted", "rejected"]


class FamilyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)


class FamilyInviteRequest(BaseModel):
    email: EmailStr
    role: FamilyRole = "member"


class FamilyInviteRespondRequest(BaseModel):
    status: Literal["accepted", "rejected"]


class FamilyMemberResponse(BaseModel):
    id: str
    familyId: str
    userId: str
    email: str | None = None
    displayName: str | None = None
    role: FamilyRole
    status: FamilyMemberStatus
    invitedBy: str | None = None
    createdAt: datetime


class FamilyResponse(BaseModel):
    id: str
    name: str
    createdBy: str
    createdAt: datetime
    updatedAt: datetime
    userRole: FamilyRole = "member"
    memberCount: int = 1
    members: list[FamilyMemberResponse] = []


class FamilyPendingInviteResponse(BaseModel):
    id: str
    familyId: str
    familyName: str
    invitedByEmail: str | None = None
    role: FamilyRole
    createdAt: datetime

