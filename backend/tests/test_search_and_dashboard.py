import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timezone, timedelta
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


async def get_auth_token(client: AsyncClient, email: str = "search_user@example.com") -> str:
    res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "displayName": email.split("@")[0].title()}
    )
    return res.json()["accessToken"]


@pytest.mark.asyncio
async def test_dashboard_stats_aggregation(client: AsyncClient):
    token = await get_auth_token(client, "dash_owner@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create collection
    col_res = await client.post("/api/collections", headers=headers, json={"name": "Finances"})
    col_id = col_res.json()["id"]

    # Create note
    await client.post(
        "/api/items",
        headers=headers,
        json={"title": "Monthly Budget", "kind": "note", "content": "Rent, Groceries", "collectionId": col_id, "favorite": True}
    )

    # Create link
    await client.post(
        "/api/items",
        headers=headers,
        json={"title": "Banking Portal", "kind": "link", "url": "https://mybank.com", "collectionId": col_id}
    )

    # Create expiring item (due in 5 days)
    due_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    await client.post(
        "/api/items",
        headers=headers,
        json={"title": "Insurance Renewal", "kind": "record", "expiresAt": due_date, "favorite": True}
    )

    # Fetch stats
    stats_res = await client.get("/api/dashboard/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()

    assert stats["totalItems"] == 3
    assert stats["totalCollections"] == 1
    assert stats["totalFavorites"] == 2
    assert stats["expiringSoonCount"] == 1
    assert len(stats["upcomingExpiries"]) == 1
    assert stats["upcomingExpiries"][0]["title"] == "Insurance Renewal"
    assert len(stats["recentItems"]) == 3


@pytest.mark.asyncio
async def test_universal_search_and_filters(client: AsyncClient):
    token = await get_auth_token(client, "searcher@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Seed items
    await client.post(
        "/api/items",
        headers=headers,
        json={"title": "Alpha Project Blueprint", "kind": "note", "content": "Architecture overview", "tags": ["tech", "alpha"]}
    )
    await client.post(
        "/api/items",
        headers=headers,
        json={"title": "Beta Roadmap", "kind": "link", "url": "https://beta.org", "tags": ["roadmap"], "favorite": True}
    )
    await client.post(
        "/api/items",
        headers=headers,
        json={"title": "Car Registration", "kind": "record", "customFields": {"vin": "12345"}, "tags": ["car", "vehicle"]}
    )

    # 1. Text query
    res = await client.get("/api/search?q=Alpha", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Alpha Project Blueprint"

    # 2. Tag filter
    res = await client.get("/api/search?tag=vehicle", headers=headers)
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["title"] == "Car Registration"

    # 3. Favorite filter
    res = await client.get("/api/search?favorite=true", headers=headers)
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["title"] == "Beta Roadmap"

    # 4. Sorting by title asc
    res = await client.get("/api/search?sortBy=title&sortOrder=asc", headers=headers)
    assert res.status_code == 200
    titles = [i["title"] for i in res.json()["items"]]
    assert titles == sorted(titles)


@pytest.mark.asyncio
async def test_trash_management(client: AsyncClient):
    token = await get_auth_token(client, "trasher@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create 2 items
    item1 = (await client.post("/api/items", headers=headers, json={"title": "Item To Delete", "kind": "note"})).json()
    item2 = (await client.post("/api/items", headers=headers, json={"title": "Item To Keep", "kind": "note"})).json()

    # Soft delete item1
    await client.delete(f"/api/items/{item1['id']}", headers=headers)

    # 1. Trash list should have 1 item
    res = await client.get("/api/trash", headers=headers)
    assert res.status_code == 200
    trashed = res.json()
    assert len(trashed) == 1
    assert trashed[0]["id"] == item1["id"]

    # 2. Restore item1
    res = await client.post(f"/api/items/{item1['id']}/restore", headers=headers)
    assert res.status_code == 200

    # Trash list now empty
    res = await client.get("/api/trash", headers=headers)
    assert len(res.json()) == 0

    # 3. Soft delete and permanently delete
    await client.delete(f"/api/items/{item1['id']}", headers=headers)
    del_res = await client.delete(f"/api/items/{item1['id']}/permanent", headers=headers)
    assert del_res.status_code == 200

    # Ensure completely gone
    res = await client.get(f"/api/items/{item1['id']}", headers=headers)
    assert res.status_code == 404

