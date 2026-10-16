import base64
import binascii
import logging
from functools import lru_cache
from typing import List, Optional

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger("ownly.config")

DEV_SECRET_KEY = "dev-insecure-secret-key-change-in-production-min32chars"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # "development" | "test" | "production". Production fails closed on weak secrets.
    ENVIRONMENT: str = "development"

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "ownly_dev"
    APP_SECRET_KEY: str = DEV_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_UPLOAD_TYPES: str = (
        "application/pdf,image/png,image/jpeg,image/webp,text/plain,application/json"
    )

    # Base64 (standard or urlsafe) encoding of exactly 32 random bytes.
    # Required in production; in development a key is derived from APP_SECRET_KEY.
    FILE_ENCRYPTION_KEY: str = ""

    # Session cookie
    COOKIE_NAME: str = "ownly_session"
    COOKIE_SAMESITE: str = "lax"  # "lax" | "strict" | "none"
    COOKIE_SECURE: Optional[bool] = None  # None => secure in production only

    # Login throttling (failed attempts inside the window)
    LOGIN_MAX_ATTEMPTS: int = 5          # per (email, client IP)
    LOGIN_IP_MAX_ATTEMPTS: int = 30      # per client IP across all emails
    LOGIN_WINDOW_MINUTES: int = 15

    @property
    def allowed_mime_types(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_UPLOAD_TYPES.split(",") if t.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        if self.COOKIE_SECURE is not None:
            return self.COOKIE_SECURE
        return self.is_production

    @model_validator(mode="after")
    def _validate_production_secrets(self) -> "Settings":
        if self.COOKIE_SAMESITE.lower() not in {"lax", "strict", "none"}:
            raise ValueError("COOKIE_SAMESITE must be one of: lax, strict, none")

        if self.is_production:
            if self.APP_SECRET_KEY == DEV_SECRET_KEY or "dev-insecure" in self.APP_SECRET_KEY:
                raise ValueError(
                    "APP_SECRET_KEY is still the development default. "
                    "Set a unique random value (e.g. `openssl rand -hex 32`) before running in production."
                )
            if len(self.APP_SECRET_KEY) < 32:
                raise ValueError("APP_SECRET_KEY must be at least 32 characters in production.")
            if not self.FILE_ENCRYPTION_KEY:
                raise ValueError(
                    "FILE_ENCRYPTION_KEY is required in production. Generate one with: "
                    "python -c \"import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())\""
                )
            if self.COOKIE_SAMESITE.lower() == "none" and not self.cookie_secure:
                raise ValueError("COOKIE_SAMESITE=none requires secure cookies.")

        if self.FILE_ENCRYPTION_KEY:
            _decode_key(self.FILE_ENCRYPTION_KEY)  # raises ValueError if malformed
        return self

    def file_master_key(self) -> bytes:
        """32-byte master key used to derive per-file encryption keys."""
        if self.FILE_ENCRYPTION_KEY:
            return _decode_key(self.FILE_ENCRYPTION_KEY)
        return _derive_dev_key(self.APP_SECRET_KEY)


def _decode_key(value: str) -> bytes:
    raw = value.strip()
    try:
        key = base64.urlsafe_b64decode(raw + "=" * (-len(raw) % 4))
    except (binascii.Error, ValueError):
        raise ValueError("FILE_ENCRYPTION_KEY must be base64-encoded.")
    if len(key) != 32:
        raise ValueError("FILE_ENCRYPTION_KEY must decode to exactly 32 bytes.")
    return key


@lru_cache(maxsize=4)
def _derive_dev_key(secret: str) -> bytes:
    logger.warning(
        "FILE_ENCRYPTION_KEY is not set; deriving a file-encryption key from APP_SECRET_KEY. "
        "This is for development only - files become unreadable if APP_SECRET_KEY changes."
    )
    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"ownly/dev-file-master-key/v1",
    ).derive(secret.encode("utf-8"))


settings = Settings()
