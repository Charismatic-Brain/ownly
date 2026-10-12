from fastapi import APIRouter, Depends, status, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.security.dependencies import get_db

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("", summary="Service and database health check")
async def health_check(db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        await db.client.admin.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "service": "ownly-api"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection error: {str(e)}"
        )

