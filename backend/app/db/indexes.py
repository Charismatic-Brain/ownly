from motor.motor_asyncio import AsyncIOMotorDatabase
import pymongo
import logging

logger = logging.getLogger("ownly.db.indexes")


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create essential MongoDB indexes idempotently on startup."""
    logger.info("Ensuring MongoDB indexes...")

    # 1. users: unique email index
    await db["users"].create_index(
        [("email", pymongo.ASCENDING)],
        unique=True,
        name="idx_users_email_unique"
    )

    # 2. vault_collections: owner, hierarchy, and name
    await db["vault_collections"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("parentId", pymongo.ASCENDING),
            ("name", pymongo.ASCENDING),
        ],
        name="idx_collections_owner_parent_name"
    )

    # 3. items: scoped by owner, collection, updated time
    await db["items"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("collectionId", pymongo.ASCENDING),
            ("updatedAt", pymongo.DESCENDING),
        ],
        name="idx_items_owner_collection_updated"
    )

    # items: tag searching
    await db["items"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("tags", pymongo.ASCENDING),
        ],
        name="idx_items_owner_tags"
    )

    # items: expiry reminders & queries
    await db["items"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("expiresAt", pymongo.ASCENDING),
        ],
        name="idx_items_owner_expires"
    )

    # 4. file_assets: owner and linked item
    await db["file_assets"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("itemId", pymongo.ASCENDING),
        ],
        name="idx_files_owner_item"
    )

    # 5. audit_logs: actor and time
    await db["audit_logs"].create_index(
        [
            ("actorUserId", pymongo.ASCENDING),
            ("createdAt", pymongo.DESCENDING),
        ],
        name="idx_audit_actor_created"
    )

    # 6. reminders: owner, remindAt, status and linked item
    await db["reminders"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("remindAt", pymongo.ASCENDING),
            ("status", pymongo.ASCENDING),
        ],
        name="idx_reminders_owner_remind_status"
    )
    await db["reminders"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("itemId", pymongo.ASCENDING),
        ],
        name="idx_reminders_owner_item"
    )

    # 7. sessions / refresh tokens if needed
    await db["sessions"].create_index(
        [
            ("userId", pymongo.ASCENDING),
            ("expiresAt", pymongo.ASCENDING),
        ],
        name="idx_sessions_user_expires"
    )

    logger.info("MongoDB indexes verified successfully.")

