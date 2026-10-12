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


async def get_auth_token(client: AsyncClient, email: str = "finance_user@example.com") -> str:
    res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "displayName": email.split("@")[0].title()}
    )
    return res.json()["accessToken"]


@pytest.mark.asyncio
async def test_transaction_crud(client: AsyncClient):
    token = await get_auth_token(client, "txn_owner@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create an income transaction
    inc_res = await client.post(
        "/api/transactions",
        headers=headers,
        json={
            "type": "income",
            "amount": 75000.50,
            "currency": "INR",
            "category": "Salary",
            "description": "Monthly software engineer salary",
        }
    )
    assert inc_res.status_code == 201
    inc_data = inc_res.json()
    assert inc_data["amount"] == 75000.50
    assert inc_data["amountPaise"] == 7500050
    assert inc_data["type"] == "income"
    txn_id = inc_data["id"]

    # 2. Get transaction
    get_res = await client.get(f"/api/transactions/{txn_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["category"] == "Salary"

    # 3. Create an expense transaction
    exp_res = await client.post(
        "/api/transactions",
        headers=headers,
        json={
            "type": "expense",
            "amount": 2500.00,
            "category": "Groceries",
            "description": "Weekly supermarket essentials",
        }
    )
    assert exp_res.status_code == 201

    # 4. List with filter
    list_exp = await client.get("/api/transactions?type=expense", headers=headers)
    assert list_exp.status_code == 200
    assert len(list_exp.json()) == 1
    assert list_exp.json()[0]["category"] == "Groceries"

    # 5. Update transaction
    patch_res = await client.patch(
        f"/api/transactions/{txn_id}",
        headers=headers,
        json={"amount": 80000.00, "description": "Salary with bonus"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["amount"] == 80000.00
    assert patch_res.json()["amountPaise"] == 8000000

    # 6. Delete transaction
    del_res = await client.delete(f"/api/transactions/{txn_id}", headers=headers)
    assert del_res.status_code == 200
    get_after = await client.get(f"/api/transactions/{txn_id}", headers=headers)
    assert get_after.status_code == 404


@pytest.mark.asyncio
async def test_bills_and_payment_flow(client: AsyncClient):
    token = await get_auth_token(client, "bills_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    due_date = (datetime.now(timezone.utc) + timedelta(days=5)).isoformat()
    # 1. Create recurring bill
    bill_res = await client.post(
        "/api/bills",
        headers=headers,
        json={
            "name": "Broadband Internet",
            "amount": 999.00,
            "frequency": "monthly",
            "nextDueAt": due_date,
            "category": "Utilities",
            "autopay": False
        }
    )
    assert bill_res.status_code == 201
    bill = bill_res.json()
    bill_id = bill["id"]
    assert bill["amount"] == 999.00
    assert bill["status"] == "active"

    # 2. List bills
    list_bills = await client.get("/api/bills?status=active", headers=headers)
    assert list_bills.status_code == 200
    assert any(b["id"] == bill_id for b in list_bills.json())

    # 3. Pay bill (creates matching expense transaction and advances due date by 30 days)
    pay_res = await client.post(f"/api/bills/{bill_id}/pay?createExpense=true", headers=headers)
    assert pay_res.status_code == 200
    updated_bill = pay_res.json()

    # Verify due date is advanced
    orig_due = datetime.fromisoformat(bill["nextDueAt"].replace("Z", "+00:00"))
    new_due = datetime.fromisoformat(updated_bill["nextDueAt"].replace("Z", "+00:00"))
    assert (new_due - orig_due).days >= 28

    # Verify expense transaction was recorded
    txns_res = await client.get("/api/transactions?type=expense", headers=headers)
    assert txns_res.status_code == 200
    txns = txns_res.json()
    assert any("Broadband Internet" in t["description"] for t in txns)


@pytest.mark.asyncio
async def test_finance_summary_aggregation(client: AsyncClient):
    token = await get_auth_token(client, "summary_user@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Add Income: 100,000
    await client.post(
        "/api/transactions",
        headers=headers,
        json={"type": "income", "amount": 100000.0, "category": "Salary"}
    )

    # Add Expenses: Groceries 15,000; Utilities 5,000; Rent 30,000 (Total Expense: 50,000)
    await client.post(
        "/api/transactions",
        headers=headers,
        json={"type": "expense", "amount": 15000.0, "category": "Groceries"}
    )
    await client.post(
        "/api/transactions",
        headers=headers,
        json={"type": "expense", "amount": 5000.0, "category": "Utilities"}
    )
    await client.post(
        "/api/transactions",
        headers=headers,
        json={"type": "expense", "amount": 30000.0, "category": "Rent"}
    )

    # Add an active bill
    due_date = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
    await client.post(
        "/api/bills",
        headers=headers,
        json={"name": "Electricity Bill", "amount": 2500.0, "nextDueAt": due_date}
    )

    # Query finance summary aggregation pipeline
    summary_res = await client.get("/api/finance/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()

    assert summary["totalIncome"] == 100000.0
    assert summary["totalExpense"] == 50000.0
    assert summary["netSavings"] == 50000.0
    assert summary["activeBillsCount"] == 1
    assert summary["upcomingBillsTotal"] == 2500.0

    # Verify category breakdown percentages:
    # Rent: 30,000 / 50,000 = 60.0%
    # Groceries: 15,000 / 50,000 = 30.0%
    # Utilities: 5,000 / 50,000 = 10.0%
    cats = {c["category"]: c for c in summary["categoryBreakdown"]}
    assert cats["Rent"]["percentage"] == 60.0
    assert cats["Groceries"]["percentage"] == 30.0
    assert cats["Utilities"]["percentage"] == 10.0


@pytest.mark.asyncio
async def test_finance_user_isolation(client: AsyncClient):
    token_a = await get_auth_token(client, "user_a_fin@example.com")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = await get_auth_token(client, "user_b_fin@example.com")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates transaction & bill
    txn_res = await client.post(
        "/api/transactions",
        headers=headers_a,
        json={"type": "expense", "amount": 500.0, "category": "Coffee"}
    )
    txn_id = txn_res.json()["id"]

    bill_res = await client.post(
        "/api/bills",
        headers=headers_a,
        json={"name": "Private Club", "amount": 10000.0, "nextDueAt": datetime.now(timezone.utc).isoformat()}
    )
    bill_id = bill_res.json()["id"]

    # User B cannot access User A's transaction
    assert (await client.get(f"/api/transactions/{txn_id}", headers=headers_b)).status_code == 404
    assert (await client.patch(f"/api/transactions/{txn_id}", headers=headers_b, json={"amount": 10.0})).status_code == 404
    assert (await client.delete(f"/api/transactions/{txn_id}", headers=headers_b)).status_code == 404

    # User B cannot access or pay User A's bill
    assert (await client.get(f"/api/bills/{bill_id}", headers=headers_b)).status_code == 404
    assert (await client.post(f"/api/bills/{bill_id}/pay", headers=headers_b)).status_code == 404
    assert (await client.delete(f"/api/bills/{bill_id}", headers=headers_b)).status_code == 404

