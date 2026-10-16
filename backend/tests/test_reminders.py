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


async def get_auth_token(client: AsyncClient, email: str = "reminder_user@example.com") -> str:
    res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "displayName": email.split("@")[0].title()}
    )
    return res.json()["accessToken"]


@pytest.mark.asyncio
async def test_reminder_crud(client: AsyncClient):
    token = await get_auth_token(client, "rem_owner@example.com")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a reminder
    remind_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    create_payload = {
        "title": "Renew Vehicle Insurance",
        "description": "Check NCB discount and renew policy",
        "remindAt": remind_time,
        "priority": "high",
        "channel": "in_app"
    }

    create_res = await client.post("/api/reminders", json=create_payload, headers=auth_headers)
    assert create_res.status_code == 201, create_res.text
    created = create_res.json()
    assert created["title"] == "Renew Vehicle Insurance"
    assert created["status"] == "pending"
    assert created["priority"] == "high"
    assert created["isOverdue"] is False
    reminder_id = created["id"]

    # 2. Get reminder
    get_res = await client.get(f"/api/reminders/{reminder_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == reminder_id

    # 3. List reminders
    list_res = await client.get("/api/reminders", headers=auth_headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(r["id"] == reminder_id for r in items)

    # 4. Update reminder status to completed
    update_res = await client.patch(
        f"/api/reminders/{reminder_id}",
        json={"status": "completed"},
        headers=auth_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "completed"

    # 5. Snooze reminder
    snooze_time = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    snooze_res = await client.patch(
        f"/api/reminders/{reminder_id}",
        json={"snoozedUntil": snooze_time},
        headers=auth_headers
    )
    assert snooze_res.status_code == 200
    assert snooze_res.json()["status"] == "snoozed"
    assert snooze_res.json()["snoozedUntil"] is not None

    # 6. Delete reminder
    del_res = await client.delete(f"/api/reminders/{reminder_id}", headers=auth_headers)
    assert del_res.status_code == 200

    # Verify deleted
    get_deleted = await client.get(f"/api/reminders/{reminder_id}", headers=auth_headers)
    assert get_deleted.status_code == 404


@pytest.mark.asyncio
async def test_reminder_with_linked_item(client: AsyncClient):
    token = await get_auth_token(client, "linked_rem@example.com")
    auth_headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a vault item
    item_payload = {
        "title": "Passport Document",
        "kind": "record",
        "description": "Republic of India Passport",
        "tags": ["travel", "id"]
    }
    item_res = await client.post("/api/items", json=item_payload, headers=auth_headers)
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    # 2. Create reminder linked to this item
    due = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    reminder_res = await client.post(
        "/api/reminders",
        json={
            "title": "Check passport expiry validity for Schengen",
            "itemId": item_id,
            "remindAt": due,
            "priority": "medium"
        },
        headers=auth_headers
    )
    assert reminder_res.status_code == 201
    rem = reminder_res.json()
    assert rem["itemId"] == item_id
    assert rem["itemTitle"] == "Passport Document"
    assert rem["itemKind"] == "record"

    # 3. Linking non-existent item fails with 404
    bad_res = await client.post(
        "/api/reminders",
        json={
            "title": "Orphan reminder",
            "itemId": "507f1f77bcf86cd799439011",
            "remindAt": due
        },
        headers=auth_headers
    )
    assert bad_res.status_code == 404


@pytest.mark.asyncio
async def test_reminder_user_isolation(client: AsyncClient):
    token_a = await get_auth_token(client, "user_a_rem@example.com")
    auth_headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = await get_auth_token(client, "user_b_rem@example.com")
    auth_headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a reminder
    due = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    create_res = await client.post(
        "/api/reminders",
        json={"title": "Secret Personal Health Check", "remindAt": due},
        headers=auth_headers_a
    )
    assert create_res.status_code == 201
    reminder_id = create_res.json()["id"]

    # User B cannot read User A's reminder
    get_res = await client.get(f"/api/reminders/{reminder_id}", headers=auth_headers_b)
    assert get_res.status_code == 404

    # User B cannot update User A's reminder
    patch_res = await client.patch(
        f"/api/reminders/{reminder_id}",
        json={"title": "Hacked title"},
        headers=auth_headers_b
    )
    assert patch_res.status_code == 404

    # User B cannot delete User A's reminder
    del_res = await client.delete(f"/api/reminders/{reminder_id}", headers=auth_headers_b)
    assert del_res.status_code == 404

    # User B's list does not contain User A's reminder
    list_res = await client.get("/api/reminders", headers=auth_headers_b)
    assert list_res.status_code == 200
    assert not any(r["id"] == reminder_id for r in list_res.json())


@pytest.mark.asyncio
async def test_upcoming_deadlines_unified(client: AsyncClient):
    token = await get_auth_token(client, "deadlines_user@example.com")
    auth_headers = {"Authorization": f"Bearer {token}"}

    now = datetime.now(timezone.utc)

    # 1. Create overdue reminder
    overdue_date = (now - timedelta(days=2)).isoformat()
    await client.post(
        "/api/reminders",
        json={"title": "Past due utility bill", "remindAt": overdue_date},
        headers=auth_headers
    )

    # 2. Create upcoming reminder
    upcoming_date = (now + timedelta(days=3)).isoformat()
    await client.post(
        "/api/reminders",
        json={"title": "Dentist Appointment", "remindAt": upcoming_date},
        headers=auth_headers
    )

    # 3. Create document item with expiresAt
    expiry_date = (now + timedelta(days=15)).isoformat()
    await client.post(
        "/api/items",
        json={
            "title": "Home Insurance Policy",
            "kind": "note",
            "expiresAt": expiry_date
        },
        headers=auth_headers
    )

    # 4. Fetch unified deadlines
    res = await client.get("/api/reminders/upcoming?days=30", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["totalActive"] >= 3
    # Check overdue list
    assert any(d["title"] == "Past due utility bill" for d in data["overdue"])
    # Check this week list
    assert any(d["title"] == "Dentist Appointment" for d in data["thisWeek"])
    # Check upcoming list contains the document expiry
    assert any("Home Insurance Policy" in d["title"] for d in data["upcoming"])

