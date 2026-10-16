from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any, Optional
from app.config import settings
from app.db.mongodb import get_database
from app.security.tokens import decode_access_token
from app.repositories.user_repository import UserRepository

http_bearer = HTTPBearer(auto_error=False)

# Cookie-authenticated requests that change state must carry this header. Browsers will not
# attach a custom header to a cross-site request without a CORS preflight, which our CORS
# policy only grants to FRONTEND_ORIGIN - a second CSRF layer on top of SameSite.
CSRF_HEADER = "x-ownly-csrf"
_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

REVOKED_TOKENS = "revoked_tokens"


async def get_db() -> AsyncIOMotorDatabase:
    return get_database()


def extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials]):
    """Return (token, came_from_cookie). Explicit Bearer headers win over the cookie."""
    if credentials and credentials.credentials:
        return credentials.credentials, False
    cookie = request.cookies.get(settings.COOKIE_NAME)
    return (cookie, True) if cookie else (None, False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    db: AsyncIOMotorDatabase = Depends(get_db)
) -> Dict[str, Any]:
    """Validate the session token (Bearer header or httpOnly cookie), check it has not been
    revoked, verify the user exists, and return the user document dict."""
    token, via_cookie = extract_token(request, credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if via_cookie and request.method not in _SAFE_METHODS:
        if request.headers.get(CSRF_HEADER) != "1":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing CSRF header.",
            )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload or not payload.get("jti"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if await db[REVOKED_TOKENS].find_one({"jti": payload["jti"]}, {"_id": 1}):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been logged out.",
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

    request.state.token_payload = payload
    return UserRepository.doc_to_dict(user_doc)
