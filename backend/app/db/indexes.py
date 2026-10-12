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

    # 5. audit_logs: actor and time, plus resource queries
    await db["audit_logs"].create_index(
        [
            ("actorUserId", pymongo.ASCENDING),
            ("createdAt", pymongo.DESCENDING),
        ],
        name="idx_audit_actor_created"
    )
    await db["audit_logs"].create_index(
        [
            ("resourceType", pymongo.ASCENDING),
            ("resourceId", pymongo.ASCENDING),
        ],
        name="idx_audit_resource"
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

    # 7. transactions: owner, occurredAt, category
    await db["transactions"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("occurredAt", pymongo.DESCENDING),
        ],
        name="idx_transactions_owner_occurred"
    )
    await db["transactions"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("category", pymongo.ASCENDING),
        ],
        name="idx_transactions_owner_category"
    )

    # 8. bills: owner, nextDueAt, status
    await db["bills"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("nextDueAt", pymongo.ASCENDING),
            ("status", pymongo.ASCENDING),
        ],
        name="idx_bills_owner_nextdue_status"
    )

    # 9. albums: owner, eventDate
    await db["albums"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("eventDate", pymongo.DESCENDING),
        ],
        name="idx_albums_owner_eventdate"
    )

    # 10. media_assets: owner, albumId, takenAt
    await db["media_assets"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("albumId", pymongo.ASCENDING),
            ("takenAt", pymongo.DESCENDING),
        ],
        name="idx_media_owner_album_taken"
    )
    await db["media_assets"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("takenAt", pymongo.DESCENDING),
        ],
        name="idx_media_owner_taken"
    )

    # 11. families: createdBy
    await db["families"].create_index(
        [
            ("createdBy", pymongo.ASCENDING),
        ],
        name="idx_families_created_by"
    )

    # 12. family_members: familyId + userId unique, and lookup by userId
    await db["family_members"].create_index(
        [
            ("familyId", pymongo.ASCENDING),
            ("userId", pymongo.ASCENDING),
        ],
        unique=True,
        name="idx_family_members_family_user_unique"
    )
    await db["family_members"].create_index(
        [
            ("userId", pymongo.ASCENDING),
            ("status", pymongo.ASCENDING),
        ],
        name="idx_family_members_user_status"
    )

    # 13. shares: recipient lookup and owner lookup
    await db["shares"].create_index(
        [
            ("recipientUserId", pymongo.ASCENDING),
            ("resourceType", pymongo.ASCENDING),
            ("resourceId", pymongo.ASCENDING),
        ],
        name="idx_shares_recipient_resource"
    )
    await db["shares"].create_index(
        [
            ("ownerId", pymongo.ASCENDING),
            ("createdAt", pymongo.DESCENDING),
        ],
        name="idx_shares_owner_created"
    )

    # 14. sessions / refresh tokens if needed
    await db["sessions"].create_index(
        [
            ("userId", pymongo.ASCENDING),
            ("expiresAt", pymongo.ASCENDING),
        ],
        name="idx_sessions_user_expires"
    )

    logger.info("MongoDB indexes verified successfully.")

