from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Dict, Any
from datetime import datetime


class UserSettings(BaseModel):
    timezone: str = "Asia/Kolkata"
    theme: str = "system"


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    displayName: str = Field(..., min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("displayName")
    @classmethod
    def clean_display_name(cls, v: str) -> str:
        return v.strip()


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    id: str
    email: str
    displayName: str
    settings: UserSettings
    createdAt: datetime
    updatedAt: datetime


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "Bearer"
    expiresIn: int
    user: UserResponse

