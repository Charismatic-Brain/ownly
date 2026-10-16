# Ownly — Your life, digitally organized.

Ownly is a full-stack personal digital life-management platform built with a modular monolith architecture. It combines user-defined collections, secure private document storage, reminders, personal finance tracking, memories, and permission-controlled family sharing.

---

## Architecture & Technology Stack

* **Frontend:** React + Vite + TypeScript (Single-Page Application)
  * Styling: Tailwind CSS
  * Navigation: React Router DOM
  * State & Server Data: TanStack Query (React Query)
  * Icons: Lucide React
* **Backend:** Python + FastAPI (REST API)
  * Schemas & Validation: Pydantic v2 & Pydantic Settings
  * Database Driver: Motor / PyMongo Async
  * Security: Argon2id password hashing (`argon2-cffi`), JWT access tokens (`pyjwt`)
  * Testing: Pytest + HTTPX
* **Database & Storage:**
  * MongoDB (Primary database for all persistent application data)
  * MongoDB GridFS (Private binary file asset storage)

---

## Current Status: All Milestones 1 through 8 Complete

- [x] **Project Scaffolding:** Clean `backend/` and `frontend/` workspaces initialized.
- [x] **Database Connectivity & Indexes:** Async connection management, health check (`GET /api/health`), and idempotent index creation for `users`, `vault_collections`, `items`, `file_assets`, `reminders`, `transactions`, `bills`, `albums`, `media_assets`, and `audit_logs`.
- [x] **Authentication Slice (Milestone 1):** Registration (`POST /api/auth/register`), Login (`POST /api/auth/login`), Logout (`POST /api/auth/logout`), and Protected Profile (`GET /api/auth/me`).
- [x] **Security:** Argon2id password hashing (`argon2-cffi`), JWT bearer tokens, email normalization, min password lengths, non-leaking user schemas.
- [x] **User-Defined Collections (Milestone 2):**
  - Collection CRUD (`GET /api/collections`, `POST /api/collections`, `PATCH /api/collections/{id}`, `DELETE /api/collections/{id}`).
  - Hierarchy & nesting support (`parentId`) with cycle detection and ancestor verification.
  - Category icons, item counts aggregation, and soft deletion.
- [x] **Vault Items (Milestone 2):**
  - Supported kinds: `note` (markdown/text content), `link` (URL bookmarks), and `record` (custom key-value fields).
  - Item CRUD with pagination (`page`, `limit`), search regex on title/description, tag filtering, and favorites.
  - Soft deletion (`deletedAt`) and restore workflow (`POST /api/items/{id}/restore`).
  - Strict owner scoping on every query and mutation to prevent IDOR vulnerabilities.
- [x] **Private File Vault & GridFS (Milestone 3):**
  - MongoDB GridFS async storage bucket integration.
  - Direct file upload (`POST /api/files/upload`) creating a new `file` vault item.
  - Attachment upload (`POST /api/items/{id}/files`) linking documents to any existing item.
  - Secure streaming downloads and inline previews (`GET /api/files/{id}/download?preview=true`) with safe `Content-Disposition`.
  - Server-side MIME allowlist verification and maximum file size (25 MB) enforcement.
  - Full cleanup of GridFS chunks on file deletion.
  - Drag-and-drop file upload zone in the frontend with preview and download controls.
- [x] **Universal Search & Dashboard Aggregations (Milestone 4):**
  - Universal Search (`GET /api/search`): Multi-criteria filtering by text query, item kind, collection, tags, favorites, and 30-day expiration status, with pagination and dynamic sorting.
  - Dashboard Aggregations (`GET /api/dashboard/stats`): Real-time MongoDB aggregation pipelines computing total counts, item kind distribution, top collections, upcoming document expirations, and recent activities.
  - Trash & Restore Management: Soft-deletion tracking, trash inspection (`GET /api/trash`), permanent deletion (`DELETE /api/items/{id}/permanent`) with automatic GridFS file purging, and batch empty trash (`DELETE /api/trash/empty`).
  - Frontend Pages: Universal Search page (`/search`), Trash page (`/trash`), upgraded responsive Dashboard (`/`), and TopBar search integration.
- [x] **Reminders and Life Dates (Milestone 5):**
  - Reminders Collection (`reminders`): Indexed on `{ ownerId: 1, remindAt: 1, status: 1 }` and `{ ownerId: 1, itemId: 1 }`.
  - Reminders CRUD (`GET /api/reminders`, `POST /api/reminders`, `GET /api/reminders/{id}`, `PATCH /api/reminders/{id}`, `DELETE /api/reminders/{id}`).
  - Status management (`pending`, `completed`, `snoozed`, `dismissed`) with dynamic quick-snooze calculations (+1d, +7d).
  - Unified Deadlines Aggregator (`GET /api/reminders/upcoming`): Real-time collation of in-app reminders and expiring vault documents grouped into Overdue, Due Today, Due This Week, and Upcoming.
  - Frontend Interface: Comprehensive Reminders & Deadlines page (`/reminders`), quick create modal (`CreateReminderModal`), linked document inspections, and dashboard integration.
- [x] **Personal Finance and Memories (Milestone 6):**
  - Personal Finance Tracking: Exact integer minor-unit paise calculations (`amountPaise: int`) avoiding floating-point rounding errors.
  - Transactions API (`GET /api/transactions`, `POST /api/transactions`, `PATCH /api/transactions/{id}`, `DELETE /api/transactions/{id}`).
  - Recurring Bills & Subscriptions (`GET /api/bills`, `POST /api/bills`, `PATCH /api/bills/{id}`, `POST /api/bills/{id}/pay`).
  - Real-Time Aggregation Summaries (`GET /api/finance/summary`): Monthly income vs expenses, category spending breakdowns with percentages, 6-month historical trends, and active recurring commitments.
  - Memories & Photo Albums: `albums` and `media_assets` collections backed by MongoDB GridFS private media streaming.
  - Media Upload & Streaming (`POST /api/media/upload`, `GET /api/media/{id}/preview`, `GET /api/media/{id}/download`).
  - Memories Timeline (`GET /api/media/timeline`): Chronological media grouping by month and year.
  - Frontend Pages: Responsive Finance Dashboard (`/finance`) and Memories Gallery & Lightbox (`/memories`).
- [x] **Family Sharing and Security Audit (Milestone 7):**
  - Family Groups: `families` and `family_members` collections with role-based governance (`admin`, `member`) and invitation status flows (`pending`, `accepted`, `rejected`).
  - Member Management: Invitation by normalized email (`POST /api/families/{id}/invites`), pending invitation review and response (`POST /api/families/invites/{id}/respond`), and member offboarding (`DELETE /api/families/{id}/members/{userId}`).
  - Granular Item-Level Sharing: Scoped share grants (`shares` collection) supporting `view` and `edit` permissions with optional expiry dates.
  - Strict Security Isolation: Access verification ensures sharing one item never leaks the owner's vault or unshared items.
  - Immediate Access Revocation: `DELETE /api/shares/{id}` immediately terminates access to shared items and attachments.
  - Authorized Shared File Streaming: Securely download and preview attachments of shared items with safe `Content-Disposition`.
  - Immutable Security Audit Trail: `audit_logs` collection logging all authentication, item mutations, sharing grants, and access checks with sanitized metadata.
  - Frontend Interface: Comprehensive Family Vault page (`/family`), granular `ShareItemModal`, and real-time Activity & Audit Feed (`/activity`).
- [x] **Polish, Synthetic Demo Seed Data & Delivery (Milestone 8):**
  - Synthetic Demo Seed Script: `backend/scripts/seed_demo_data.py` generating realistic demo users, collections, notes, GridFS documents, bills, photo albums, family group, and cross-account item shares.
  - Settings & Cryptographic Specifications Page: Responsive `frontend/src/pages/SettingsPage.tsx` displaying profile information, encryption parameters, demo credentials, and session controls.
  - Production Build: Full TypeScript verification (`tsc -b`) and Vite production bundle generated cleanly.
  - Comprehensive Testing: backend test suites covering auth, collections, files, search, reminders, finance, memories, sharing and security hardening (`pytest tests -v`).

---

## Synthetic Demo Data & Ready-to-Use Accounts

Ownly provides pre-seeded synthetic demo data for immediate testing and evaluation:

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Primary Account (Family Admin)** | `demo@ownly.dev` | `DemoPassword123!` |
| **Partner Account (Family Member)** | `partner@ownly.dev` | `DemoPassword123!` |

### Re-seeding Synthetic Demo Records

To reset or populate the development database with synthetic data:

```bash
cd backend
source .venv/bin/activate
python scripts/seed_demo_data.py
```

---

## Prerequisites

1. **Node.js** (v20+ LTS) and **npm**
2. **Python** (v3.12+) and `python3-venv`
3. **MongoDB** (v8.0+) running locally on `localhost:27017`

---

## Quick Start Guide

### 1. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Optional: Seed synthetic demo records
python scripts/seed_demo_data.py

# Run FastAPI server
uvicorn app.main:app --reload --port 8000
```

The interactive API documentation is available at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install

# Run Vite dev server
npm run dev
```

The web application will be accessible at: `http://localhost:5173` (configured to proxy `/api` requests to backend port 8000).

---

## Running Automated Tests

Run the complete test suite against your live MongoDB instance:

```bash
cd backend
source .venv/bin/activate
pytest tests -v
```

The suite runs with full isolation and tests authentication, collections, GridFS files, universal search, reminders, finance calculations, memories, family groups, and access boundaries.

---

## Security Architecture & Design Decisions

1. **Password Hashing:** Implemented with Argon2id (`argon2-cffi`) using salt generation and memory-hard parameters conforming to RFC 9106.
2. **Sessions:** Login sets an `httpOnly`, `SameSite=Lax` (and `Secure` in production) cookie holding an HMAC-SHA256 JWT, so page scripts never see the token. Every token carries a unique `jti`; logout adds it to a server-side deny-list (TTL-expired), so a copied token stops working. Cookie-authenticated state-changing requests must send an `X-Ownly-CSRF: 1` header (on top of SameSite and a locked-down CORS policy). `Authorization: Bearer` is still accepted for API clients. Identity is derived strictly from verified claims; client-supplied `ownerId` values are rejected.
3. **Strict Owner Isolation & IDOR Defense:** Every query for owned resources scopes by both resource ID and caller's `ownerId`. Knowing another user's ObjectId never grants access.
4. **Binary Asset Protection:** Binary documents and photos are stored in private MongoDB GridFS buckets. They are streamed strictly through authenticated and authorized backend endpoints with safe `Content-Disposition` and MIME type allowlists.
5. **Exact Integer Minor Units for Currency:** All monetary amounts are recorded in integer paise (`amountPaise: int`) to eliminate floating-point rounding errors in calculations and aggregations.
6. **Encryption at rest for files:** Every file and photo/video stored in GridFS is encrypted with AES-256-GCM (chunked, authenticated; per-file key derived via HKDF from `FILE_ENCRYPTION_KEY`). Tampering, truncation, and reordering are detected on read. This is *server-side* encryption: it protects database dumps, backups and direct DB access, but not a compromise of the running server (which holds the key), and it covers file bytes only - titles, notes, finance records and metadata are stored unencrypted in MongoDB. End-to-end (client-side) encryption is not implemented. Files stored before this change remain plaintext until you run `python scripts/encrypt_existing_files.py --apply` (back up first). Keep `FILE_ENCRYPTION_KEY` backed up separately; losing it makes stored files unrecoverable.
7. **Login throttling:** Failed logins are counted per (email, client IP) and per IP in MongoDB; exceeding the limits returns `429` with `Retry-After`, even for unknown emails, and unknown-email logins take the same time as wrong-password ones. When deployed behind a reverse proxy, run uvicorn with `--proxy-headers --forwarded-allow-ips=<proxy ip>` so the real client IP is used.
8. **Upload validation:** Beyond the MIME allowlist and size limit, file contents are checked against the declared type (magic bytes), SVG uploads are not accepted, and downloads are served with `nosniff` and a sandboxing CSP.
9. **Fail-closed configuration:** With `ENVIRONMENT=production` the app refuses to start unless `APP_SECRET_KEY` is a non-default value of 32+ characters and `FILE_ENCRYPTION_KEY` is set. Search input is regex-escaped.
10. **Immutable Audit Logging:** Key security and mutation actions (`auth.*`, `item.*`, `share.*`, `family.*`) are recorded with timestamps, actor IDs, and sanitized metadata (passwords and secrets are strictly redacted).

---

## Known Limitations

- **Session lifetime:** Sessions last `ACCESS_TOKEN_EXPIRE_MINUTES` (24 h default) with no refresh-token rotation; logout revokes the current session only.
- **Email Delivery:** In-app reminders and invitations are fully functional; SMTP/SES delivery is optional and omitted locally to avoid unsolicited external communications during testing.
- **Single-Database Deployment:** MongoDB serves as both the document store and GridFS binary repository to allow self-contained local development without requiring external S3/cloud dependencies.


