import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.indexes import create_indexes
from app.config import settings
import uuid


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


async def get_auth_token(client: AsyncClient, email: str = "item_user@example.com") -> str:
    res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "displayName": email.split("@")[0].title()}
    )
    return res.json()["accessToken"]


@pytest.mark.asyncio
async def test_item_kinds_and_crud(client: AsyncClient):
    token = await get_auth_token(client, "items_author@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a note item
    res = await client.post(
        "/api/items",
        headers=headers,
        json={
            "title": "Meeting Notes",
            "kind": "note",
            "content": "# Project Kickoff\nDiscussed requirements.",
            "tags": ["work", "notes"]
        }
    )
    assert res.status_code == 201
    note = res.json()
    assert note["kind"] == "note"
    assert note["content"] == "# Project Kickoff\nDiscussed requirements."
    assert "work" in note["tags"]
    note_id = note["id"]

    # 2. Create a link item without URL fails
    res = await client.post(
        "/api/items",
        headers=headers,
        json={"title": "Bookmark", "kind": "link"}
    )
    assert res.status_code == 400

    # 3. Create a link item with URL succeeds
    res = await client.post(
        "/api/items",
        headers=headers,
        json={
            "title": "FastAPI Docs",
            "kind": "link",
            "url": "https://fastapi.tiangolo.com",
            "tags": ["docs", "python"]
        }
    )
    assert res.status_code == 201
    link = res.json()
    assert link["url"] == "https://fastapi.tiangolo.com"

    # 4. Create a structured record item with custom fields
    res = await client.post(
        "/api/items",
        headers=headers,
        json={
            "title": "Car Insurance Policy",
            "kind": "record",
            "customFields": {"policyNumber": "POL-998811", "vehicle": "Honda Civic"},
            "tags": ["vehicle", "insurance"]
        }
    )
    assert res.status_code == 201
    record = res.json()
    assert record["customFields"]["policyNumber"] == "POL-998811"

    # 5. Toggle favorite
    res = await client.post(f"/api/items/{note_id}/favorite", headers=headers)
    assert res.status_code == 200
    assert res.json()["favorite"] is True

    # Toggle again -> False
    res = await client.post(f"/api/items/{note_id}/favorite", headers=headers)
    assert res.status_code == 200
    assert res.json()["favorite"] is False

    # 6. Filter items by tag
    res = await client.get("/api/items?tag=docs", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "FastAPI Docs"

    # 7. Soft delete and restore
    res = await client.delete(f"/api/items/{note_id}", headers=headers)
    assert res.status_code == 200

    # Not returned in regular list
    res = await client.get("/api/items", headers=headers)
    assert res.json()["total"] == 2  # link & record

    # Restore from trash
    res = await client.post(f"/api/items/{note_id}/restore", headers=headers)
    assert res.status_code == 200
    assert res.json()["deletedAt"] is None

    res = await client.get("/api/items", headers=headers)
    assert res.json()["total"] == 3


@pytest.mark.asyncio
async def test_item_user_isolation(client: AsyncClient):
    token_a = await get_auth_token(client, "user_item_a@example.com")
    token_b = await get_auth_token(client, "user_item_b@example.com")

    # User A creates note
    res = await client.post(
        "/api/items",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"title": "Secret Diary", "kind": "note", "content": "Confidential"}
    )
    item_a_id = res.json()["id"]

    # User B cannot read User A's item
    res = await client.get(
        f"/api/items/{item_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res.status_code == 404

    # User B cannot delete User A's item
    res = await client.delete(
        f"/api/items/{item_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res.status_code == 404

    # User B cannot update User A's item
    res = await client.patch(
        f"/api/items/{item_a_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "Hacked"}
    )
    assert res.status_code == 404

