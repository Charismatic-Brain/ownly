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


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    res = await client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    payload = {
        "email": "Test.User@Example.Com",
        "password": "StrongPassword123!",
        "displayName": "Test User"
    }
    res = await client.post("/api/auth/register", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "accessToken" in data
    assert data["user"]["email"] == "test.user@example.com"
    assert data["user"]["displayName"] == "Test User"
    assert "passwordHash" not in data["user"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "test.user@example.com",
        "password": "StrongPassword123!",
        "displayName": "Test User"
    }
    res1 = await client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_register_short_password_fails(client: AsyncClient):
    payload = {
        "email": "short@example.com",
        "password": "short",
        "displayName": "Short User"
    }
    res = await client.post("/api/auth/register", json=payload)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    # First register
    await client.post(
        "/api/auth/register",
        json={"email": "login.test@example.com", "password": "StrongPassword123!", "displayName": "Login Test"}
    )

    payload = {
        "email": "login.test@example.com",
        "password": "StrongPassword123!"
    }
    res = await client.post("/api/auth/login", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "accessToken" in data
    assert data["user"]["email"] == "login.test@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post(
        "/api/auth/register",
        json={"email": "wrong.pw@example.com", "password": "StrongPassword123!", "displayName": "Wrong PW"}
    )

    payload = {
        "email": "wrong.pw@example.com",
        "password": "WrongPassword999!"
    }
    res = await client.post("/api/auth/login", json=payload)
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]


@pytest.mark.asyncio
async def test_auth_me_authenticated(client: AsyncClient):
    reg_res = await client.post(
        "/api/auth/register",
        json={"email": "me.test@example.com", "password": "StrongPassword123!", "displayName": "Me Test"}
    )
    token = reg_res.json()["accessToken"]

    res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "me.test@example.com"
    assert data["displayName"] == "Me Test"


@pytest.mark.asyncio
async def test_auth_me_unauthenticated(client: AsyncClient):
    res = await client.get("/api/auth/me")
    assert res.status_code == 401

