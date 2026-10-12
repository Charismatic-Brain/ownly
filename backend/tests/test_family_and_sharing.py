import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.indexes import create_indexes
from app.config import settings
import uuid
import io


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
async def test_family_creation_invitation_and_roles(client: AsyncClient):
    # 1. Register User A (admin) and User B (member)
    res_a = await client.post("/api/auth/register", json={
        "email": "family_admin@test.com",
        "password": "Password123!",
        "displayName": "Family Admin"
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["accessToken"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = await client.post("/api/auth/register", json={
        "email": "family_member@test.com",
        "password": "Password123!",
        "displayName": "Family Member"
    })
    assert res_b.status_code == 201
    token_b = res_b.json()["accessToken"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. User A creates family
    fam_res = await client.post(
        "/api/families",
        json={"name": "The Incredibles"},
        headers=headers_a
    )
    assert fam_res.status_code == 201
    family = fam_res.json()
    assert family["name"] == "The Incredibles"
    assert family["userRole"] == "admin"
    family_id = family["id"]

    # 3. User A invites User B
    inv_res = await client.post(
        f"/api/families/{family_id}/invites",
        json={"email": "family_member@test.com", "role": "member"},
        headers=headers_a
    )
    assert inv_res.status_code == 201
    invite_id = inv_res.json()["id"]

    # 4. User B checks pending invites
    pend_res = await client.get("/api/families/invites/pending", headers=headers_b)
    assert pend_res.status_code == 200
    pending_list = pend_res.json()
    assert len(pending_list) == 1
    assert pending_list[0]["familyName"] == "The Incredibles"

    # 5. User B accepts invite
    resp_res = await client.post(
        f"/api/families/invites/{invite_id}/respond",
        json={"status": "accepted"},
        headers=headers_b
    )
    assert resp_res.status_code == 200
    assert resp_res.json()["status"] == "accepted"

    # 6. User B can view family details
    detail_res = await client.get(f"/api/families/{family_id}", headers=headers_b)
    assert detail_res.status_code == 200
    assert detail_res.json()["memberCount"] == 2

    # 7. Non-admin (User B) cannot invite members
    fail_inv = await client.post(
        f"/api/families/{family_id}/invites",
        json={"email": "outsider@test.com", "role": "member"},
        headers=headers_b
    )
    assert fail_inv.status_code == 403


@pytest.mark.asyncio
async def test_item_sharing_and_access_boundary(client: AsyncClient):
    # Register Owner and Viewer
    owner_res = await client.post("/api/auth/register", json={
        "email": "doc_owner@test.com",
        "password": "Password123!",
        "displayName": "Doc Owner"
    })
    token_owner = owner_res.json()["accessToken"]
    headers_owner = {"Authorization": f"Bearer {token_owner}"}

    viewer_res = await client.post("/api/auth/register", json={
        "email": "doc_viewer@test.com",
        "password": "Password123!",
        "displayName": "Doc Viewer"
    })
    token_viewer = viewer_res.json()["accessToken"]
    headers_viewer = {"Authorization": f"Bearer {token_viewer}"}

    # Owner creates two items: Item 1 (shared) and Item 2 (private)
    item1_res = await client.post("/api/items", json={
        "title": "Family Wi-Fi & Credentials",
        "kind": "note",
        "content": "SSID: HomeNetwork, Password: SecretKey99"
    }, headers=headers_owner)
    item1_id = item1_res.json()["id"]

    item2_res = await client.post("/api/items", json={
        "title": "Secret Personal Will",
        "kind": "note",
        "content": "Confidential legal document."
    }, headers=headers_owner)
    item2_id = item2_res.json()["id"]

    # Owner uploads a file to Item 1
    file_bytes = b"Router backup config data 2026"
    upload_res = await client.post(
        f"/api/items/{item1_id}/files",
        files={"file": ("router-config.txt", io.BytesIO(file_bytes), "text/plain")},
        headers=headers_owner
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["file"]["id"]

    # Owner shares Item 1 with Viewer
    share_res = await client.post("/api/shares", json={
        "resourceType": "item",
        "resourceId": item1_id,
        "recipientEmail": "doc_viewer@test.com",
        "permissions": "view"
    }, headers=headers_owner)
    assert share_res.status_code == 201
    share_id = share_res.json()["id"]

    # Viewer reads Item 1
    shared_view = await client.get(f"/api/shares/items/{item1_id}", headers=headers_viewer)
    assert shared_view.status_code == 200
    shared_data = shared_view.json()
    assert shared_data["title"] == "Family Wi-Fi & Credentials"
    assert "SecretKey99" in shared_data["content"]
    assert len(shared_data["files"]) == 1

    # Viewer downloads attached file
    dl_res = await client.get(f"/api/shares/files/{file_id}/download", headers=headers_viewer)
    assert dl_res.status_code == 200
    assert dl_res.content == file_bytes

    # Viewer CANNOT access Item 2 (isolated vault boundary!)
    unshared_view = await client.get(f"/api/shares/items/{item2_id}", headers=headers_viewer)
    assert unshared_view.status_code == 403

    # Viewer cannot access Item 2 through direct items endpoint either
    direct_view = await client.get(f"/api/items/{item2_id}", headers=headers_viewer)
    assert direct_view.status_code == 404


@pytest.mark.asyncio
async def test_share_revocation_and_expiration(client: AsyncClient):
    owner_res = await client.post("/api/auth/register", json={
        "email": "revoke_owner@test.com",
        "password": "Password123!",
        "displayName": "Revoke Owner"
    })
    token_owner = owner_res.json()["accessToken"]
    headers_owner = {"Authorization": f"Bearer {token_owner}"}

    viewer_res = await client.post("/api/auth/register", json={
        "email": "revoke_viewer@test.com",
        "password": "Password123!",
        "displayName": "Revoke Viewer"
    })
    token_viewer = viewer_res.json()["accessToken"]
    headers_viewer = {"Authorization": f"Bearer {token_viewer}"}

    item_res = await client.post("/api/items", json={
        "title": "Temporary Passcode",
        "kind": "note",
        "content": "Code: 4421"
    }, headers=headers_owner)
    item_id = item_res.json()["id"]

    # Share with viewer
    share_res = await client.post("/api/shares", json={
        "resourceType": "item",
        "resourceId": item_id,
        "recipientEmail": "revoke_viewer@test.com",
        "permissions": "view"
    }, headers=headers_owner)
    share_id = share_res.json()["id"]

    # Viewer can access before revocation
    res_before = await client.get(f"/api/shares/items/{item_id}", headers=headers_viewer)
    assert res_before.status_code == 200

    # Owner revokes share
    rev_res = await client.delete(f"/api/shares/{share_id}", headers=headers_owner)
    assert rev_res.status_code == 200

    # Viewer IMMEDIATELY loses access
    res_after = await client.get(f"/api/shares/items/{item_id}", headers=headers_viewer)
    assert res_after.status_code == 403


@pytest.mark.asyncio
async def test_audit_logs_collection_and_isolation(client: AsyncClient):
    reg_res = await client.post("/api/auth/register", json={
        "email": "audit_user@test.com",
        "password": "Password123!",
        "displayName": "Audit User"
    })
    token = reg_res.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Perform actions: create item, delete item
    item_res = await client.post("/api/items", json={
        "title": "Audit Test Note",
        "kind": "note",
        "content": "Check log generation"
    }, headers=headers)
    item_id = item_res.json()["id"]

    del_res = await client.delete(f"/api/items/{item_id}", headers=headers)
    assert del_res.status_code == 200

    # Fetch audit logs
    audit_res = await client.get("/api/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["total"] >= 3  # auth.register, item.create, item.delete

    actions = [log["action"] for log in audit_data["logs"]]
    assert "auth.register" in actions
    assert "item.create" in actions
    assert "item.delete" in actions

    # Verify every log entry has actor matching current user and no leaked passwords
    for log in audit_data["logs"]:
        assert log["actorEmail"] == "audit_user@test.com"
        assert "password" not in log.get("metadata", {})
