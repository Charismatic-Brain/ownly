import re
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger("ownly.db")


def _redact_uri(uri: str) -> str:
    """Strip user:password@ from a connection string before logging it."""
    return re.sub(r"//[^/@]*@", "//***@", uri)


class MongoManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


mongo_manager = MongoManager()


async def connect_to_mongo() -> None:
    logger.info("Connecting to MongoDB at %s...", _redact_uri(settings.MONGODB_URI))
    mongo_manager.client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        serverSelectionTimeoutMS=5000
    )
    mongo_manager.db = mongo_manager.client[settings.MONGODB_DATABASE]
    # Ping database to confirm connection
    await mongo_manager.client.admin.command("ping")
    logger.info("Connected to MongoDB database: %s", settings.MONGODB_DATABASE)


async def close_mongo_connection() -> None:
    if mongo_manager.client:
        logger.info("Closing MongoDB connection...")
        mongo_manager.client.close()
        mongo_manager.client = None
        mongo_manager.db = None
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    if mongo_manager.db is None:
        raise RuntimeError("MongoDB connection is not established.")
    return mongo_manager.db

