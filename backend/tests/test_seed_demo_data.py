import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.indexes import create_indexes
from app.config import settings
from scripts.seed_demo_data import seed_data
import uuid


@pytest.fixture(autouse=True)
async def setup_test_db():
    settings.MONGODB_DATABASE = f"ownly_test_{uuid.uuid4().hex[:8]}"
    await connect_to_mongo()
    db = get_database()
    await create_indexes(db)
    # Seed data into this isolated test database
    await seed_data()
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
async def test_seeded_demo_accounts_login_and_data(client: AsyncClient):
    # 1. Login with primary demo account
    res_primary = await client.post("/api/auth/login", json={
        "email": "demo@ownly.dev",
        "password": "DemoPassword123!"
    })
    assert res_primary.status_code == 200, res_primary.text
    token_primary = res_primary.json()["accessToken"]
    headers_primary = {"Authorization": f"Bearer {token_primary}"}

    # Verify user profile
    profile_res = await client.get("/api/auth/me", headers=headers_primary)
    assert profile_res.status_code == 200
    assert profile_res.json()["displayName"] == "Demo User"

    # 2. Login with partner account
    res_partner = await client.post("/api/auth/login", json={
        "email": "partner@ownly.dev",
        "password": "DemoPassword123!"
    })
    assert res_partner.status_code == 200
    token_partner = res_partner.json()["accessToken"]
    headers_partner = {"Authorization": f"Bearer {token_partner}"}

    # Verify collections exist for primary
    cols_res = await client.get("/api/collections", headers=headers_primary)
    assert cols_res.status_code == 200
    assert len(cols_res.json()) >= 3

    # Verify items exist for primary
    items_res = await client.get("/api/items", headers=headers_primary)
    assert items_res.status_code == 200
    assert items_res.json()["total"] >= 4

    # Verify reminders exist
    rem_res = await client.get("/api/reminders", headers=headers_primary)
    assert rem_res.status_code == 200
    assert len(rem_res.json()) >= 3

    # Verify finance summary exists and calculates paise minor units
    fin_res = await client.get("/api/finance/summary", headers=headers_primary)
    assert fin_res.status_code == 200
    fin_data = fin_res.json()
    assert fin_data["totalIncome"] > 0
    assert fin_data["totalExpense"] > 0

    # Verify family group and members
    fam_res = await client.get("/api/families", headers=headers_primary)
    assert fam_res.status_code == 200
    assert len(fam_res.json()) >= 1
    assert fam_res.json()[0]["name"] == "Miller Household Vault"

    # Verify partner sees inbound shares
    inbound_res = await client.get("/api/shares/inbound", headers=headers_partner)
    assert inbound_res.status_code == 200
    assert len(inbound_res.json()) >= 2
