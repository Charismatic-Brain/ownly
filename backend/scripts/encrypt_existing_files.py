"""Encrypt GridFS files that were stored before encryption at rest was introduced.

Dry-run by default: reports how many files would be migrated and changes nothing.

    python scripts/encrypt_existing_files.py           # report only
    python scripts/encrypt_existing_files.py --apply   # migrate

BACK UP YOUR DATABASE FIRST (mongodump). For each plaintext file the script:
  1. streams it into a new encrypted GridFS file,
  2. decrypts the new file and checks its SHA-256 equals the original's,
  3. repoints the file_assets / media_assets document to the new file (only if it still
     points at the old one),
  4. deletes the old plaintext file.
A file that fails verification is left untouched and the new copy is removed. The script is
safe to re-run; already-encrypted files are skipped. Requires the same FILE_ENCRYPTION_KEY
(or APP_SECRET_KEY in development) the application uses.
"""
import argparse
import asyncio
import hashlib
import os
import sys
from typing import Dict

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase  # noqa: E402

from app.config import settings  # noqa: E402
from app.storage.crypto import ENCRYPTION_ID  # noqa: E402
from app.storage.gridfs import GridFSStorage  # noqa: E402

COLLECTIONS = ("file_assets", "media_assets")


async def _migrate_one(db: AsyncIOMotorDatabase, storage: GridFSStorage, coll: str, doc: dict, apply: bool) -> str:
    old_id = doc["gridFsId"]
    try:
        raw = await storage.open_raw_download_stream(old_id)
    except Exception:
        return "missing"

    metadata = dict(getattr(raw, "metadata", None) or {})
    if metadata.get("encryption") == ENCRYPTION_ID:
        return "already_encrypted"
    if not apply:
        return "would_migrate"

    original_hash = hashlib.sha256()

    async def plaintext_chunks():
        while True:
            chunk = await raw.readchunk()
            if not chunk:
                break
            original_hash.update(chunk)
            yield chunk

    filename = getattr(raw, "filename", None) or doc.get("originalName") or "file.bin"
    metadata.pop("encryption", None)
    new_id = await storage.upload_stream(filename=filename, stream=plaintext_chunks(), metadata=metadata)

    # Verify the encrypted copy decrypts back to identical bytes before touching anything else
    verify_hash = hashlib.sha256()
    try:
        check = await storage.open_download_stream(new_id)
        while True:
            chunk = await check.readchunk()
            if not chunk:
                break
            verify_hash.update(chunk)
    except Exception:
        await storage.delete_file(new_id)
        return "verify_failed"
    if verify_hash.digest() != original_hash.digest():
        await storage.delete_file(new_id)
        return "verify_failed"

    result = await db[coll].update_one({"_id": doc["_id"], "gridFsId": old_id}, {"$set": {"gridFsId": new_id}})
    if result.modified_count != 1:
        await storage.delete_file(new_id)  # document changed underneath us; leave it alone
        return "skipped_changed"

    await storage.delete_file(old_id)
    return "migrated"


async def migrate(db: AsyncIOMotorDatabase, apply: bool = False) -> Dict[str, int]:
    storage = GridFSStorage(db)
    counts: Dict[str, int] = {}
    for coll in COLLECTIONS:
        async for doc in db[coll].find({"gridFsId": {"$exists": True, "$ne": None}}):
            outcome = await _migrate_one(db, storage, coll, doc, apply)
            counts[outcome] = counts.get(outcome, 0) + 1
    return counts


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="actually migrate (default is a dry run)")
    args = parser.parse_args()

    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]
    print(f"Database: {settings.MONGODB_DATABASE} ({'APPLY' if args.apply else 'dry run'})")
    counts = await migrate(db, apply=args.apply)
    for outcome, n in sorted(counts.items()):
        print(f"  {outcome}: {n}")
    if not counts:
        print("  no stored files found")
    if not args.apply and counts.get("would_migrate"):
        print("Re-run with --apply to migrate (back up first).")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
