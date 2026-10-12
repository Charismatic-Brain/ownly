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


async def get_auth_token(client: AsyncClient, email: str = "alice@example.com") -> str:
    res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "displayName": email.split("@")[0].title()}
    )
    return res.json()["accessToken"]


@pytest.mark.asyncio
async def test_collection_crud_and_nesting(client: AsyncClient):
    token = await get_auth_token(client, "user_col@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create root collection
    res = await client.post(
        "/api/collections",
        headers=headers,
        json={"name": "Healthcare", "description": "Medical & Insurance", "icon": "heart-pulse"}
    )
    assert res.status_code == 201
    root = res.json()
    assert root["name"] == "Healthcare"
    assert root["parentId"] is None
    root_id = root["id"]

    # 2. Create child collection
    res = await client.post(
        "/api/collections",
        headers=headers,
        json={"name": "Prescriptions", "parentId": root_id}
    )
    assert res.status_code == 201
    child = res.json()
    assert child["parentId"] == root_id
    child_id = child["id"]

    # 3. List collections
    res = await client.get("/api/collections", headers=headers)
    assert res.status_code == 200
    cols = res.json()
    assert len(cols) == 2

    # 4. Cycle prevention (set root parent to child)
    res = await client.patch(
        f"/api/collections/{root_id}",
        headers=headers,
        json={"parentId": child_id}
    )
    assert res.status_code == 400
    assert "Circular" in res.json()["detail"] or "hierarchy" in res.json()["detail"]

    # 5. Prevent setting collection as its own parent
    res = await client.patch(
        f"/api/collections/{root_id}",
        headers=headers,
        json={"parentId": root_id}
    )
    assert res.status_code == 400

    # 6. Delete collection
    res = await client.delete(f"/api/collections/{child_id}", headers=headers)
    assert res.status_code == 200

    # 7. Ensure deleted collection is not listed
    res = await client.get("/api/collections", headers=headers)
    cols = res.json()
    assert len(cols) == 1
    assert cols[0]["id"] == root_id


@pytest.mark.asyncio
async def test_collection_user_isolation(client: AsyncClient):
    token_a = await get_auth_token(client, "user_a@example.com")
    token_b = await get_auth_token(client, "user_b@example.com")

    # User A creates a collection
    res = await client.post(
        "/api/collections",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"name": "User A Private Collection"}
    )
    col_a_id = res.json()["id"]

    # User B cannot view User A's collection
    res = await client.get(
        f"/api/collections/{col_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res.status_code == 404

    # User B cannot delete User A's collection
    res = await client.delete(
        f"/api/collections/{col_a_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res.status_code == 404

    # User B cannot create child of User A's collection
    res = await client.post(
        "/api/collections",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"name": "Intruder Collection", "parentId": col_a_id}
    )
    assert res.status_code == 400

