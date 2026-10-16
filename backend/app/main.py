from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection, get_database
from app.db.indexes import create_indexes
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.collections import router as collections_router
from app.api.routes.items import router as items_router
from app.api.routes.files import router as files_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.search import router as search_router
from app.api.routes.trash import router as trash_router
from app.api.routes.reminders import router as reminders_router
from app.api.routes.finance import router as finance_router
from app.api.routes.memories import router as memories_router
from app.api.routes.family import router as family_router
from app.api.routes.sharing import router as sharing_router
from app.api.routes.audit import router as audit_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ownly.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to Mongo and ensure indexes
    logger.info("Initializing Ownly API application...")
    try:
        await connect_to_mongo()
        db = get_database()
        await create_indexes(db)
        logger.info("Application startup completed successfully.")
    except Exception as e:
        logger.error("Failed to initialize database during startup: %s", e)
        # We don't abort immediately to allow health checks to report error status
    yield
    # Shutdown: close Mongo connection
    logger.info("Shutting down Ownly API application...")
    await close_mongo_connection()
    logger.info("Application shutdown completed.")


app = FastAPI(
    title="Ownly API",
    description="Your life, digitally organized. Full-stack digital life-management platform.",
    version="0.1.0",
    lifespan=lifespan
)

# CORS setup
origins = [settings.FRONTEND_ORIGIN]
if not settings.is_production:
    origins += ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(set(origins)),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Ownly-CSRF"],
)

# Include API routes
app.include_router(auth_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(collections_router, prefix="/api")
app.include_router(items_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(trash_router, prefix="/api")
app.include_router(reminders_router, prefix="/api")
app.include_router(finance_router, prefix="/api")
app.include_router(memories_router, prefix="/api")
app.include_router(family_router, prefix="/api")
app.include_router(sharing_router, prefix="/api")
app.include_router(audit_router, prefix="/api")


@app.get("/", summary="Root status")
async def root():
    return {
        "app": "Ownly API",
        "version": "0.1.0",
        "status": "online",
        "docs": "/docs"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."}
    )

