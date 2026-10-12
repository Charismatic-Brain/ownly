from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "ownly_dev"
    APP_SECRET_KEY: str = "dev-insecure-secret-key-change-in-production-min32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_UPLOAD_TYPES: str = (
        "application/pdf,image/png,image/jpeg,image/webp,text/plain,application/json"
    )

    @property
    def allowed_mime_types(self) -> List[str]:
        return [t.strip() for t in self.ALLOWED_UPLOAD_TYPES.split(",") if t.strip()]


settings = Settings()

