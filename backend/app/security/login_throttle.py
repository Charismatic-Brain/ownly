"""Failed-login throttling backed by MongoDB (shared across workers, TTL-expired)."""
import hashlib
import math
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.config import settings


def _key(*parts: str) -> str:
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()


class LoginThrottle:
    COLLECTION = "login_attempts"

    def __init__(self, db: AsyncIOMotorDatabase):
        self.col = db[self.COLLECTION]
        self.window = timedelta(minutes=settings.LOGIN_WINDOW_MINUTES)

    @staticmethod
    def account_key(email: str, ip: str) -> str:
        return _key("acct", email.strip().lower(), ip)

    @staticmethod
    def ip_key(ip: str) -> str:
        return _key("ip", ip)

    async def _retry_after(self, key: str, now: datetime) -> int:
        oldest = await self.col.find_one(
            {"key": key, "createdAt": {"$gte": now - self.window}},
            sort=[("createdAt", 1)],
        )
        if not oldest:
            return 1
        created = oldest["createdAt"]
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return max(1, math.ceil((created + self.window - now).total_seconds()))

    async def check(self, email: str, ip: str) -> None:
        """Raise 429 if this (email, ip) pair or this IP has too many recent failures."""
        now = datetime.now(timezone.utc)
        since = now - self.window
        for key, limit in (
            (self.account_key(email, ip), settings.LOGIN_MAX_ATTEMPTS),
            (self.ip_key(ip), settings.LOGIN_IP_MAX_ATTEMPTS),
        ):
            failures = await self.col.count_documents(
                {"key": key, "createdAt": {"$gte": since}}
            )
            if failures >= limit:
                retry = await self._retry_after(key, now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed login attempts. Please try again later.",
                    headers={"Retry-After": str(retry)},
                )

    async def record_failure(self, email: str, ip: str) -> None:
        now = datetime.now(timezone.utc)
        await self.col.insert_many([
            {"key": self.account_key(email, ip), "createdAt": now},
            {"key": self.ip_key(ip), "createdAt": now},
        ])

    async def clear(self, email: str, ip: str) -> None:
        await self.col.delete_many({"key": self.account_key(email, ip)})
