from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse
)
from app.services.auth_service import AuthService
from app.security.dependencies import get_db, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
async def register(
    req: UserRegisterRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = AuthService(db)
    return await service.register(req)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in with email and password"
)
async def login(
    req: UserLoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = AuthService(db)
    return await service.login(req)


@router.post(
    "/logout",
    summary="Log out of the current session"
)
async def logout(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return {"message": "Logged out successfully."}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile"
)
async def get_me(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    return UserResponse(**current_user)

