import datetime
import uuid

import pytest
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from app.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.storage.gridfs import GridFSStorage
from scripts.encrypt_existing_files import migrate


@pytest.fixture
async def db():
    settings.MONGODB_DATABASE = f"ownly_test_{uuid.uuid4().hex[:8]}"
    await connect_to_mongo()
    database = get_database()
    yield database
    try:
        await database.client.drop_database(settings.MONGODB_DATABASE)
    except Exception:
        pass
    await close_mongo_connection()


async def _read_all(stream) -> bytes:
    out = b""
    while True:
        chunk = await stream.readchunk()
        if not chunk:
            return out
        out += chunk


@pytest.mark.asyncio
async def test_migration_encrypts_legacy_files_and_is_idempotent(db):
    plain = b"legacy passport scan " * 20000
    legacy_id = await AsyncIOMotorGridFSBucket(db).upload_from_stream("old.pdf", plain)
    doc = await db["file_assets"].insert_one({
        "ownerId": ObjectId(), "itemId": ObjectId(), "originalName": "old.pdf",
        "mimeType": "application/pdf", "sizeBytes": len(plain), "gridFsId": legacy_id,
        "createdAt": datetime.datetime.now(datetime.timezone.utc)})
    storage = GridFSStorage(db)

    assert await migrate(db, apply=False) == {"would_migrate": 1}  # dry run changes nothing
    assert (await db["file_assets"].find_one({"_id": doc.inserted_id}))["gridFsId"] == legacy_id

    assert await migrate(db, apply=True) == {"migrated": 1}
    new_id = (await db["file_assets"].find_one({"_id": doc.inserted_id}))["gridFsId"]
    assert new_id != legacy_id

    raw = await _read_all(await storage.open_raw_download_stream(new_id))
    assert b"legacy passport" not in raw and raw.startswith(b"OWLY\x01")
    assert await _read_all(await storage.open_download_stream(new_id)) == plain
    with pytest.raises(Exception):
        await storage.open_raw_download_stream(legacy_id)  # old plaintext copy removed

    assert await migrate(db, apply=True) == {"already_encrypted": 1}
