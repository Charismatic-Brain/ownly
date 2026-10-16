"""Tests for encryption at rest, upload sniffing, session cookies/revocation, throttling,
search escaping and production config validation."""
import io
import os
import uuid

import pytest
from httpx import AsyncClient, ASGITransport
from pydantic import ValidationError

from app.config import Settings, DEV_SECRET_KEY
from app.main import app
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.indexes import create_indexes
from app.config import settings
from app.security.file_validation import signature_matches
from app.storage.crypto import (
    CHUNK_SIZE, HEADER_LEN, TAG_LEN, DecryptionError, decrypt_stream, encrypt_stream,
)


# ---------------------------------------------------------------- pure unit tests

async def _gen(parts):
    for p in parts:
        yield p


async def _collect(it):
    return b"".join([x async for x in it])


@pytest.mark.asyncio
@pytest.mark.parametrize("size", [0, 1, CHUNK_SIZE - 1, CHUNK_SIZE, CHUNK_SIZE + 1, 3 * CHUNK_SIZE + 17])
async def test_crypto_round_trip(size):
    key, data = os.urandom(32), os.urandom(size)
    enc = await _collect(encrypt_stream(_gen([data[i:i + 5000] for i in range(0, size, 5000)] or [b""]), key))
    assert data[:32] not in enc or size < 32
    pieces = [enc[i:i + 777] for i in range(0, len(enc), 777)]
    assert await _collect(decrypt_stream(_gen(pieces), key)) == data


@pytest.mark.asyncio
async def test_crypto_detects_tampering_truncation_and_wrong_key():
    key, data = os.urandom(32), os.urandom(3 * CHUNK_SIZE)
    enc = await _collect(encrypt_stream(_gen([data]), key))
    frame = 4 + CHUNK_SIZE + TAG_LEN

    flipped = bytearray(enc)
    flipped[HEADER_LEN + 10] ^= 1
    cases = {
        "bit flip": (bytes(flipped), key),
        "truncated mid-frame": (enc[:-5], key),
        "dropped final frame": (enc[:HEADER_LEN + 2 * frame], key),
        "dropped middle frame": (enc[:HEADER_LEN + frame] + enc[HEADER_LEN + 2 * frame:], key),
        "wrong key": (enc, os.urandom(32)),
        "garbage": (b"not an encrypted file at all", key),
    }
    for name, (blob, k) in cases.items():
        with pytest.raises(DecryptionError):
            await _collect(decrypt_stream(_gen([blob]), k))


def test_signature_matching():
    assert signature_matches("application/pdf", b"%PDF-1.7 ...")
    assert not signature_matches("application/pdf", b"<html><script>alert(1)</script>")
    assert signature_matches("image/png", b"\x89PNG\r\n\x1a\n....")
    assert not signature_matches("image/png", b"GIF89a....")
    assert signature_matches("image/jpeg", b"\xff\xd8\xff\xe0")
    assert signature_matches("image/webp", b"RIFF\x00\x00\x00\x00WEBPVP8 ")
    assert signature_matches("text/plain", "héllo wörld".encode())
    assert not signature_matches("text/plain", b"MZ\x90\x00\x03\x00\x00\x00")
    assert signature_matches("application/json", b' \n{"a": 1}')
    assert not signature_matches("application/json", b"<?xml version='1.0'?>")
    assert signature_matches("application/x-unknown-type", b"anything")


def test_production_config_fails_closed():
    good = dict(
        ENVIRONMENT="production",
        APP_SECRET_KEY="x" * 40,
        FILE_ENCRYPTION_KEY="A" * 43,  # 32 bytes urlsafe-b64 without padding
    )
    Settings(_env_file=None, **good)
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{**good, "APP_SECRET_KEY": DEV_SECRET_KEY})
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{**good, "APP_SECRET_KEY": "short"})
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{**good, "FILE_ENCRYPTION_KEY": ""})
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **{**good, "FILE_ENCRYPTION_KEY": "AAAA"})  # wrong length
    # development stays permissive
    Settings(_env_file=None, ENVIRONMENT="development")


# ------------------------------------------------------- integration tests (MongoDB)

@pytest.fixture
async def db():
    settings.MONGODB_DATABASE = f"ownly_test_{uuid.uuid4().hex[:8]}"
    await connect_to_mongo()
    database = get_database()
    await create_indexes(database)
    yield database
    try:
        await database.client.drop_database(settings.MONGODB_DATABASE)
    except Exception:
        pass
    await close_mongo_connection()


@pytest.fixture
async def client(db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        yield ac


async def _register(client, email="sec@example.com", password="StrongPassword123!"):
    res = await client.post("/api/auth/register", json={
        "email": email, "password": password, "displayName": "Sec"})
    assert res.status_code == 201
    return res


@pytest.mark.asyncio
async def test_uploaded_file_is_encrypted_at_rest_and_round_trips(client, db):
    token = (await _register(client)).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    content = b"%PDF-1.4 " + b"super secret passport number 12345 " * 5000  # multi-chunk
    res = await client.post("/api/files/upload", headers=headers,
                            files={"file": ("p.pdf", content, "application/pdf")})
    assert res.status_code == 201
    file_id = res.json()["file"]["id"]

    # raw stored bytes must not contain the plaintext
    from motor.motor_asyncio import AsyncIOMotorGridFSBucket
    from bson import ObjectId
    asset = await db["file_assets"].find_one({"_id": ObjectId(file_id)})
    raw = await (await AsyncIOMotorGridFSBucket(db).open_download_stream(asset["gridFsId"])).read()
    assert b"super secret passport" not in raw
    assert raw.startswith(b"OWLY\x01")

    dl = await client.get(f"/api/files/{file_id}/download", headers=headers)
    assert dl.status_code == 200
    assert dl.content == content
    assert dl.headers["content-length"] == str(len(content))
    assert "sandbox" in dl.headers["content-security-policy"]


@pytest.mark.asyncio
async def test_legacy_plaintext_files_still_download(client, db):
    token = (await _register(client)).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    created = await client.post("/api/items", headers=headers,
                                json={"title": "legacy", "kind": "note", "content": "x"})
    item_id = created.json()["id"]
    from motor.motor_asyncio import AsyncIOMotorGridFSBucket
    from bson import ObjectId
    plain = b"legacy plaintext bytes"
    gid = await AsyncIOMotorGridFSBucket(db).upload_from_stream("old.txt", plain)  # no encryption metadata
    me = (await client.get("/api/auth/me", headers=headers)).json()
    asset = await db["file_assets"].insert_one({
        "ownerId": ObjectId(me["id"]), "itemId": ObjectId(item_id), "originalName": "old.txt",
        "mimeType": "text/plain", "sizeBytes": len(plain), "gridFsId": gid, "sha256": "x",
        "createdAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc)})
    dl = await client.get(f"/api/files/{asset.inserted_id}/download", headers=headers)
    assert dl.status_code == 200 and dl.content == plain


@pytest.mark.asyncio
async def test_upload_with_mismatched_content_is_rejected_without_orphan_item(client, db):
    token = (await _register(client)).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    res = await client.post("/api/files/upload", headers=headers, files={
        "file": ("evil.pdf", b"<html><script>alert(1)</script></html>", "application/pdf")})
    assert res.status_code == 415
    assert await db["items"].count_documents({}) == 0
    assert await db["file_assets"].count_documents({}) == 0


@pytest.mark.asyncio
async def test_svg_media_is_not_accepted(client):
    token = (await _register(client)).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    res = await client.post("/api/media/upload", headers=headers,
                            files={"file": ("x.svg", svg, "image/svg+xml")})
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_login_sets_httponly_cookie_and_cookie_auth_works(client):
    await _register(client)
    res = await client.post("/api/auth/login", json={
        "email": "sec@example.com", "password": "StrongPassword123!"})
    assert res.status_code == 200
    set_cookie = res.headers["set-cookie"].lower()
    assert f"{settings.COOKIE_NAME}=" in set_cookie
    assert "httponly" in set_cookie and "samesite=lax" in set_cookie and "path=/api" in set_cookie

    client.cookies.clear()
    client.cookies.set(settings.COOKIE_NAME, res.json()["accessToken"], path="/api")
    me = await client.get("/api/auth/me")  # cookie only, no Authorization header
    assert me.status_code == 200 and me.json()["email"] == "sec@example.com"


@pytest.mark.asyncio
async def test_cookie_auth_requires_csrf_header_on_state_changing_requests(client):
    token = (await _register(client)).json()["accessToken"]
    client.cookies.clear()
    client.cookies.set(settings.COOKIE_NAME, token, path="/api")
    body = {"name": "Docs", "icon": "folder"}

    blocked = await client.post("/api/collections", json=body)
    assert blocked.status_code == 403

    allowed = await client.post("/api/collections", json=body, headers={"X-Ownly-CSRF": "1"})
    assert allowed.status_code == 201

    # Explicit Bearer auth is not ambient, so it needs no CSRF header
    bearer = await client.post("/api/collections", json={"name": "B", "icon": "folder"},
                               headers={"Authorization": f"Bearer {token}"}, cookies={})
    assert bearer.status_code == 201


@pytest.mark.asyncio
async def test_logout_revokes_token_and_clears_cookie(client):
    token = (await _register(client)).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    assert (await client.get("/api/auth/me", headers=headers)).status_code == 200

    out = await client.post("/api/auth/logout", headers=headers)
    assert out.status_code == 200
    assert "max-age=0" in out.headers["set-cookie"].lower() or "expires=" in out.headers["set-cookie"].lower()

    again = await client.get("/api/auth/me", headers=headers)
    assert again.status_code == 401  # same JWT, now deny-listed


@pytest.mark.asyncio
async def test_token_without_jti_is_rejected(client):
    import jwt as pyjwt
    from datetime import datetime, timedelta, timezone
    res = await _register(client)
    uid = res.json()["user"]["id"]
    legacy = pyjwt.encode(
        {"sub": uid, "email": "sec@example.com",
         "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp())},
        settings.APP_SECRET_KEY, algorithm=settings.ALGORITHM)
    assert (await client.get("/api/auth/me", headers={"Authorization": f"Bearer {legacy}"})).status_code == 401


@pytest.mark.asyncio
async def test_login_lockout_after_repeated_failures(client):
    await _register(client)
    bad = {"email": "sec@example.com", "password": "wrong-password"}
    for _ in range(settings.LOGIN_MAX_ATTEMPTS):
        assert (await client.post("/api/auth/login", json=bad)).status_code == 401

    locked = await client.post("/api/auth/login", json=bad)
    assert locked.status_code == 429 and int(locked.headers["retry-after"]) > 0

    # even the correct password is refused while locked
    ok = await client.post("/api/auth/login", json={
        "email": "sec@example.com", "password": "StrongPassword123!"})
    assert ok.status_code == 429


@pytest.mark.asyncio
async def test_unknown_email_is_throttled_identically(client):
    bad = {"email": "nobody@example.com", "password": "whatever-123"}
    for _ in range(settings.LOGIN_MAX_ATTEMPTS):
        assert (await client.post("/api/auth/login", json=bad)).status_code == 401
    assert (await client.post("/api/auth/login", json=bad)).status_code == 429


@pytest.mark.asyncio
async def test_successful_login_resets_failure_counter(client):
    await _register(client)
    bad = {"email": "sec@example.com", "password": "wrong-password"}
    good = {"email": "sec@example.com", "password": "StrongPassword123!"}
    for _ in range(settings.LOGIN_MAX_ATTEMPTS - 1):
        await client.post("/api/auth/login", json=bad)
    assert (await client.post("/api/auth/login", json=good)).status_code == 200
    for _ in range(settings.LOGIN_MAX_ATTEMPTS - 1):
        assert (await client.post("/api/auth/login", json=bad)).status_code == 401


@pytest.mark.asyncio
async def test_item_list_search_treats_input_literally(client):
    token = (await _register(client)).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    for title in ["Plain note", "Cost (est.) [draft]"]:
        await client.post("/api/items", headers=headers, json={"title": title, "kind": "note", "content": "x"})
    # unescaped, ".*" would match everything and "(" would raise a regex error (500)
    star = await client.get("/api/items", headers=headers, params={"search": ".*"})
    assert star.status_code == 200 and star.json()["total"] == 0
    paren = await client.get("/api/items", headers=headers, params={"search": "(est.)"})
    assert paren.status_code == 200 and paren.json()["total"] == 1
