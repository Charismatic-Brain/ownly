from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, Optional
from app.db.mongodb import get_database
from app.security.tokens import decode_access_token
from app.repositories.user_repository import UserRepository

http_bearer = HTTPBearer(auto_error=False)


async def get_db() -> AsyncIOMotorDatabase:
    return get_database()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> Dict[str, Any]:
    """Validate Bearer token, verify user exists in DB, and return user document dict."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    repo = UserRepository(db)
    user_doc = await repo.find_by_id(user_id)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserRepository.doc_to_dict(user_doc)

