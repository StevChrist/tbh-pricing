"""
Database engine, session factory, and FastAPI dependency for TBH Price Tracker.
Uses SQLAlchemy 2.x async engine with SQLite (aiosqlite).
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.db.models import AppSetting, Base

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Database path — loaded dynamically from settings
# ---------------------------------------------------------------------------

DATABASE_URL = settings.database_url

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # set True for SQL query logging during development
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

# ---------------------------------------------------------------------------
# Default settings seed
# ---------------------------------------------------------------------------

DEFAULT_SETTINGS: dict[str, str] = {
    "refresh_interval_minutes": "30",
    "steam_currency_idr": "10",
    "steam_currency_usd": "1",
    "steam_app_id": "3678970",
    "steam_request_delay_seconds": "3",
    "last_run_at": "",
    "next_run_at": "",
    "is_running": "false",
    "items_refreshed_last_run": "0",
    "items_unavailable_last_run": "0",
}


# ---------------------------------------------------------------------------
# Init DB — create tables + seed default settings
# ---------------------------------------------------------------------------


async def init_db() -> None:
    """
    Create all tables and seed default app_settings rows.
    Idempotent: skips rows that already exist.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified.")

    async with AsyncSessionLocal() as session:
        for key, value in DEFAULT_SETTINGS.items():
            existing = await session.get(AppSetting, key)
            if existing is None:
                session.add(AppSetting(key=key, value=value))
        await session.commit()
    logger.info("Default app_settings seeded.")


# ---------------------------------------------------------------------------
# FastAPI dependency — yields async session, always cleans up
# ---------------------------------------------------------------------------


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a transactional database session per request.
    Always closes the session, even on exceptions.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
