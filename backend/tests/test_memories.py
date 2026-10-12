import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
import uuid

from app.main import app
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.indexes import create_indexes
from app.config import settings


@pytest.fixture(autouse=True)
async def setup_test_db():
    settings.MONGODB_DATABASE = f"ownly_test_{uuid.uuid4().hex[:8]}"
    await connect_to_mongo()
    db = get_database()
    await create_indexes(db)
    yield db
    try:
        await db.client.drop_database(settings.MONGODB_DATABASE)
    except Exception:
        pass
    await close_mongo_connection()


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver"
    ) as ac:
        yield ac


async def get_auth_token(client: AsyncClient, email: str = "memories_user@example.com") -> str:
    res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "displayName": email.split("@")[0].title()}
    )
    return res.json()["accessToken"]


@pytest.mark.asyncio
async def test_album_crud(client: AsyncClient):
    token = await get_auth_token(client, "album_owner@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create album
    create_res = await client.post(
        "/api/albums",
        headers=headers,
        json={
            "title": "Summer Road Trip 2026",
            "description": "Family trip across coastal highway",
            "tags": ["travel", "family", "vacation"]
        }
    )
    assert create_res.status_code == 201
    album = create_res.json()
    assert album["title"] == "Summer Road Trip 2026"
    assert album["mediaCount"] == 0
    album_id = album["id"]

    # 2. Get album
    get_res = await client.get(f"/api/albums/{album_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["title"] == "Summer Road Trip 2026"

    # 3. Update album
    patch_res = await client.patch(
        f"/api/albums/{album_id}",
        headers=headers,
        json={"title": "Coastal Vacation 2026"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Coastal Vacation 2026"

    # 4. List albums
    list_res = await client.get("/api/albums", headers=headers)
    assert list_res.status_code == 200
    assert any(a["id"] == album_id for a in list_res.json())

    # 5. Delete album
    del_res = await client.delete(f"/api/albums/{album_id}", headers=headers)
    assert del_res.status_code == 200
    assert (await client.get(f"/api/albums/{album_id}", headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_media_upload_and_streaming(client: AsyncClient):
    token = await get_auth_token(client, "media_owner@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create album
    album_res = await client.post(
        "/api/albums",
        headers=headers,
        json={"title": "Goa Trip"}
    )
    album_id = album_res.json()["id"]

    # Upload test image
    fake_image_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF" + b"\x00" * 200
    files = {"file": ("sunset.jpg", fake_image_bytes, "image/jpeg")}
    data = {"caption": "Sunset by the beach", "tags": "beach,sunset"}

    upload_res = await client.post(
        f"/api/albums/{album_id}/media",
        headers=headers,
        files=files,
        data=data,
    )
    assert upload_res.status_code == 201
    media = upload_res.json()
    assert media["originalName"] == "sunset.jpg"
    assert media["mimeType"] == "image/jpeg"
    assert media["caption"] == "Sunset by the beach"
    media_id = media["id"]

    # Verify album mediaCount and coverMediaId updated
    get_album = await client.get(f"/api/albums/{album_id}", headers=headers)
    assert get_album.status_code == 200
    assert get_album.json()["mediaCount"] == 1
    assert get_album.json()["coverMediaId"] == media_id

    # Test preview streaming endpoint
    preview_res = await client.get(f"/api/media/{media_id}/preview", headers=headers)
    assert preview_res.status_code == 200
    assert preview_res.headers["content-type"] == "image/jpeg"
    assert 'inline; filename="sunset.jpg"' in preview_res.headers["content-disposition"]
    assert len(preview_res.content) == len(fake_image_bytes)

    # Test download streaming endpoint
    download_res = await client.get(f"/api/media/{media_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert 'attachment; filename="sunset.jpg"' in download_res.headers["content-disposition"]

    # Test timeline grouping
    timeline_res = await client.get("/api/media", headers=headers)
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert timeline["totalMedia"] == 1
    assert len(timeline["groups"]) >= 1

    # Delete media asset
    del_media = await client.delete(f"/api/media/{media_id}", headers=headers)
    assert del_media.status_code == 200

    # Stream deleted media returns 404
    assert (await client.get(f"/api/media/{media_id}/preview", headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_memories_user_isolation(client: AsyncClient):
    token_a = await get_auth_token(client, "user_a_mem@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = await get_auth_token(client, "user_b_mem@example.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates album and uploads photo
    album_res = await client.post("/api/albums", headers=headers_a, json={"title": "User A Private Album"})
    album_id = album_res.json()["id"]

    fake_bytes = b"PHOTO_BYTES_DATA"
    files = {"file": ("private.png", fake_bytes, "image/png")}
    upload_res = await client.post(f"/api/albums/{album_id}/media", headers=headers_a, files=files)
    media_id = upload_res.json()["id"]

    # User B cannot read User A's album
    assert (await client.get(f"/api/albums/{album_id}", headers=headers_b)).status_code == 404
    assert (await client.patch(f"/api/albums/{album_id}", headers=headers_b, json={"title": "Hacked"})).status_code == 404
    assert (await client.delete(f"/api/albums/{album_id}", headers=headers_b)).status_code == 404

    # User B cannot upload to User A's album
    bad_files = {"file": ("attack.png", fake_bytes, "image/png")}
    assert (await client.post(f"/api/albums/{album_id}/media", headers=headers_b, files=bad_files)).status_code == 404

    # User B cannot preview or delete User A's media
    assert (await client.get(f"/api/media/{media_id}/preview", headers=headers_b)).status_code == 404
    assert (await client.get(f"/api/media/{media_id}/download", headers=headers_b)).status_code == 404
    assert (await client.delete(f"/api/media/{media_id}", headers=headers_b)).status_code == 404

