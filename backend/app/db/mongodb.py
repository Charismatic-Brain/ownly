import re
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Optional
from app.config import settings
import logging

try:
    import certifi
    _ca_file = certifi.where()
except ImportError:
    _ca_file = None

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
    client_kwargs = {
        "serverSelectionTimeoutMS": 5000,
    }
    uri_lower = settings.MONGODB_URI.lower()
    if _ca_file and ("+srv" in uri_lower or "tls=true" in uri_lower or "ssl=true" in uri_lower):
        client_kwargs["tlsCAFile"] = _ca_file

    mongo_manager.client = AsyncIOMotorClient(
        settings.MONGODB_URI,
        **client_kwargs
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

