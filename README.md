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

## Current Status: Milestones 1 through 5 Complete

- [x] **Project Scaffolding:** Clean `backend/` and `frontend/` workspaces initialized.
- [x] **Database Connectivity & Indexes:** Async connection management, health check (`GET /api/health`), and idempotent index creation for `users`, `vault_collections`, `items`, `file_assets`, and `audit_logs`.
- [x] **Authentication Slice:** Registration (`POST /api/auth/register`), Login (`POST /api/auth/login`), Logout (`POST /api/auth/logout`), and Protected Profile (`GET /api/auth/me`).
- [x] **Security:** Argon2id password hashing, JWT bearer tokens, email normalization, min password lengths, non-leaking user schemas.
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
- [x] **Automated Tests:** 23/23 pytest tests passing against live MongoDB instance.

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

# Run FastAPI server
uvicorn app.main:app --reload --port 8000
```

The API docs will be available at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend
npm install

# Run Vite dev server
npm run dev
```

The app will be available at: `http://localhost:5173` (proxies `/api` to the backend on port 8000).

---

## Running Tests

From the `backend/` directory with virtual environment activated:

```bash
pytest tests -v
```

---

## Next Milestone: Milestone 6 — Finance and Memories
* Personal finance & bills tracking (`transactions`, `bills` collections) with Decimal128 / integer minor units.
* Monthly & category spending aggregation pipelines.
* Memories module (`albums`, `media_assets` collections) with GridFS photo/video storage and timeline view.


