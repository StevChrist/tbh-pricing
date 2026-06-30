"""
TBH Inventory Price Tracker — FastAPI application entry point.

Registers all routers, configures CORS, starts/stops the APScheduler,
and initialises the database on startup.
"""

from __future__ import annotations

import logging
import logging.config
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core import security
from app.core.config import settings
from app.core.scheduler import create_scheduler
from app.db.database import init_db

# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------

logging.config.dictConfig(
    {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            }
        },
        "root": {"handlers": ["console"], "level": "INFO"},
    }
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Inject secret key into security module at startup
# ---------------------------------------------------------------------------

security.SECRET_KEY = settings.secret_key


# ---------------------------------------------------------------------------
# Lifespan: startup + shutdown
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """FastAPI lifespan handler — runs before/after the app serves requests."""
    # Startup
    logger.info("Starting TBH Inventory Price Tracker…")
    await init_db()

    # Reset scheduler lock on startup to clear any stale locks from previous crashes
    from app.db.database import AsyncSessionLocal
    from app.db import crud
    async with AsyncSessionLocal() as db:
        try:
            await crud.set_setting(db, "is_running", "false")
            await db.commit()
            logger.info("Startup: Reset scheduler lock 'is_running' to false.")
        except Exception as exc:
            logger.error("Startup: Failed to reset scheduler lock: %s", exc)

    import asyncio
    from app.core.scheduler import run_startup_jobs
    
    interval = settings.refresh_interval_minutes
    scheduler = create_scheduler(interval_minutes=interval)
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("Scheduler started (interval=%d min).", interval)
    
    # Run startup seeding and price refresh in background
    asyncio.create_task(run_startup_jobs())

    yield  # App is serving requests

    # Shutdown
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped. Goodbye.")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="TBH Inventory Price Tracker",
    description=(
        "Track your Task Bar Hero in-game inventory with live Steam Market prices. "
        "Supports dual currency (IDR + USD), price alerts, and automated refresh."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,  # required for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static files serving
# ---------------------------------------------------------------------------

from fastapi.staticfiles import StaticFiles
import os
os.makedirs("static/items", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------------------------------------------------------------------------
# Global exception handler — consistent JSON error format
# ---------------------------------------------------------------------------


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception on %s: %s", request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "code": "INTERNAL_ERROR", "field": None},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

from app.api.routes import auth, alerts, inventory, items, notifications, prices, settings as settings_routes  # noqa: E402

API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(items.router, prefix=API_PREFIX)
app.include_router(inventory.router, prefix=API_PREFIX)
app.include_router(prices.router, prefix=API_PREFIX)
app.include_router(alerts.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(settings_routes.router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["system"])
async def health_check() -> dict:
    """Simple liveness check."""
    return {"status": "ok", "app": settings.app_name}
