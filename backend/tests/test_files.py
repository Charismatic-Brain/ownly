import pytest
import io
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


async def get_auth_token(client: AsyncClient, email: str = "file_user@example.com") -> str:
    res = await client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "displayName": email.split("@")[0].title()}
    )
    return res.json()["accessToken"]


@pytest.mark.asyncio
async def test_direct_file_upload_and_download(client: AsyncClient):
    token = await get_auth_token(client, "uploader@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    sample_content = b"%PDF-1.4 sample pdf content for ownly vault testing"
    files = {
        "file": ("passport_scan.pdf", sample_content, "application/pdf")
    }
    data = {
        "title": "Passport Copy"
    }

    # 1. Upload file directly
    res = await client.post(
        "/api/files/upload",
        headers=headers,
        files=files,
        data=data
    )
    assert res.status_code == 201
    upload_res = res.json()
    file_id = upload_res["file"]["id"]
    item_id = upload_res["itemId"]
    assert upload_res["file"]["originalName"] == "passport_scan.pdf"
    assert upload_res["file"]["mimeType"] == "application/pdf"
    assert upload_res["file"]["sizeBytes"] == len(sample_content)

    # 2. Verify vault item was created and linked
    item_res = await client.get(f"/api/items/{item_id}", headers=headers)
    assert item_res.status_code == 200
    item_data = item_res.json()
    assert item_data["kind"] == "file"
    assert len(item_data["files"]) == 1
    assert item_data["files"][0]["id"] == file_id

    # 3. Stream download the file
    download_res = await client.get(f"/api/files/{file_id}/download", headers=headers)
    assert download_res.status_code == 200
    assert download_res.content == sample_content
    assert download_res.headers["content-type"] == "application/pdf"
    assert "attachment" in download_res.headers["content-disposition"]

    # 4. Preview inline
    preview_res = await client.get(f"/api/files/{file_id}/download?preview=true", headers=headers)
    assert preview_res.status_code == 200
    assert "inline" in preview_res.headers["content-disposition"]


@pytest.mark.asyncio
async def test_attach_file_to_existing_item(client: AsyncClient):
    token = await get_auth_token(client, "attacher@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create note item first
    create_res = await client.post(
        "/api/items",
        headers=headers,
        json={"title": "Tax Records 2026", "kind": "note", "content": "Attached invoices."}
    )
    item_id = create_res.json()["id"]

    # Upload attachment to existing item
    attachment_content = b"invoice receipt text payload"
    files = {
        "file": ("invoice.txt", attachment_content, "text/plain")
    }
    upload_res = await client.post(
        f"/api/items/{item_id}/files",
        headers=headers,
        files=files
    )
    assert upload_res.status_code == 201
    file_id = upload_res.json()["file"]["id"]

    # Verify item now includes the attachment
    item_res = await client.get(f"/api/items/{item_id}", headers=headers)
    assert len(item_res.json()["files"]) == 1
    assert item_res.json()["files"][0]["id"] == file_id


@pytest.mark.asyncio
async def test_unsupported_mime_type_rejected(client: AsyncClient):
    token = await get_auth_token(client, "strict@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    files = {
        "file": ("malicious.exe", b"binary content", "application/x-msdos-program")
    }
    res = await client.post(
        "/api/files/upload",
        headers=headers,
        files=files
    )
    assert res.status_code == 415
    assert "not allowed" in res.json()["detail"]


@pytest.mark.asyncio
async def test_file_user_isolation_and_deletion(client: AsyncClient):
    token_a = await get_auth_token(client, "user_fa@example.com")
    token_b = await get_auth_token(client, "user_fb@example.com")

    # User A uploads file
    files = {"file": ("secret.pdf", b"%PDF-1.4 secret", "application/pdf")}
    res = await client.post(
        "/api/files/upload",
        headers={"Authorization": f"Bearer {token_a}"},
        files=files
    )
    file_id = res.json()["file"]["id"]

    # User B cannot download User A's file
    res = await client.get(
        f"/api/files/{file_id}/download",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res.status_code == 404

    # User B cannot delete User A's file
    res = await client.delete(
        f"/api/files/{file_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res.status_code == 404

    # User A deletes file
    del_res = await client.delete(
        f"/api/files/{file_id}",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert del_res.status_code == 200

    # User A cannot download deleted file
    res = await client.get(
        f"/api/files/{file_id}/download",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res.status_code == 404

