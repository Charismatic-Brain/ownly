from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.user_repository import UserRepository
from app.security.password import hash_password, verify_password
from app.security.tokens import create_access_token
from app.security.login_throttle import LoginThrottle
from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    TokenResponse,
    UserResponse
)
from app.config import settings
import logging

logger = logging.getLogger("ownly.services.auth")


@lru_cache(maxsize=1)
def _dummy_hash() -> str:
    # Verified against when the email is unknown so response time doesn't reveal
    # whether an account exists.
    return hash_password("ownly-timing-equalizer")


from app.services.audit_service import log_audit_event


class AuthService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.repo = UserRepository(db)

    async def register(self, req: UserRegisterRequest) -> TokenResponse:
        existing = await self.repo.find_by_email(req.email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email address already exists."
            )

        pw_hash = hash_password(req.password)
        user_doc = await self.repo.create_user(
            email=req.email,
            password_hash=pw_hash,
            display_name=req.displayName
        )

        user_dict = UserRepository.doc_to_dict(user_doc)
        token = create_access_token(
            user_id=user_dict["id"],
            email=user_dict["email"]
        )

        await log_audit_event(
            self.db,
            actor_user_id=user_dict["id"],
            action="auth.register",
            resource_type="user",
            resource_id=user_dict["id"],
            outcome="success",
        )

        return TokenResponse(
            accessToken=token,
            expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse(**user_dict)
        )

    async def login(self, req: UserLoginRequest, client_ip: str = "unknown") -> TokenResponse:
        throttle = LoginThrottle(self.db)
        await throttle.check(req.email, client_ip)

        user_doc = await self.repo.find_by_email(req.email)
        stored_hash = user_doc.get("passwordHash", "") if user_doc else _dummy_hash()
        password_ok = verify_password(req.password, stored_hash)

        if not user_doc or not password_ok:
            await throttle.record_failure(req.email, client_ip)
            if user_doc:
                await log_audit_event(
                    self.db,
                    actor_user_id=str(user_doc["_id"]),
                    action="auth.login",
                    resource_type="user",
                    resource_id=str(user_doc["_id"]),
                    outcome="denied",
                )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password."
            )

        await throttle.clear(req.email, client_ip)

        user_dict = UserRepository.doc_to_dict(user_doc)
        token = create_access_token(
            user_id=user_dict["id"],
            email=user_dict["email"]
        )

        await log_audit_event(
            self.db,
            actor_user_id=user_dict["id"],
            action="auth.login",
            resource_type="user",
            resource_id=user_dict["id"],
            outcome="success",
        )

        return TokenResponse(
            accessToken=token,
            expiresIn=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse(**user_dict)
        )

    async def revoke_token(self, payload: Optional[Dict[str, Any]]) -> None:
        """Deny-list a session token's jti until it would have expired anyway."""
        if not payload or not payload.get("jti"):
            return
        expires_at = datetime.fromtimestamp(int(payload.get("exp", 0)), tz=timezone.utc)
        await self.db["revoked_tokens"].update_one(
            {"jti": payload["jti"]},
            {"$setOnInsert": {"jti": payload["jti"], "userId": payload.get("sub"), "expiresAt": expires_at}},
            upsert=True,
        )
        await log_audit_event(
            self.db,
            actor_user_id=str(payload.get("sub")),
            action="auth.logout",
            resource_type="user",
            resource_id=str(payload.get("sub")),
            outcome="success",
        )

    async def get_current_user_profile(self, user_id: str) -> UserResponse:
        user_doc = await self.repo.find_by_id(user_id)
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or session invalid."
            )
        return UserResponse(**UserRepository.doc_to_dict(user_doc))

