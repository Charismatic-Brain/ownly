from fastapi import APIRouter, Depends, Request, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse
)
from app.services.auth_service import AuthService
from app.config import settings
from app.security.dependencies import get_db, get_current_user, http_bearer, extract_token
from app.security.tokens import decode_access_token
from fastapi.security import HTTPAuthorizationCredentials
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

COOKIE_PATH = "/api"


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.COOKIE_SAMESITE.lower(),
        path=COOKIE_PATH,
    )


def _client_ip(request: Request) -> str:
    # Behind a reverse proxy run uvicorn with --proxy-headers and --forwarded-allow-ips
    # so request.client reflects the real client address.
    return request.client.host if request.client else "unknown"


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
async def register(
    req: UserRegisterRequest,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = AuthService(db)
    result = await service.register(req)
    _set_session_cookie(response, result.accessToken)
    return result


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in with email and password"
)
async def login(
    req: UserLoginRequest,
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = AuthService(db)
    result = await service.login(req, client_ip=_client_ip(request))
    _set_session_cookie(response, result.accessToken)
    return result


@router.post(
    "/logout",
    summary="Log out: revoke the session token and clear the session cookie"
)
async def logout(
    request: Request,
    response: Response,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Deliberately tolerant: always clears the cookie, even if the session already expired.
    token, _ = extract_token(request, credentials)
    if token:
        await AuthService(db).revoke_token(decode_access_token(token))
    response.delete_cookie(
        key=settings.COOKIE_NAME,
        path=COOKIE_PATH,
        secure=settings.cookie_secure,
        httponly=True,
        samesite=settings.COOKIE_SAMESITE.lower(),
    )
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

