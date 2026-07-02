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

    # Auto-add missing columns & modify constraints (self-healing migration supporting SQLite & PostgreSQL)
    def add_missing_columns(connection):
        from sqlalchemy import inspect, text
        inspector = inspect(connection)
        
        # 1. users table
        columns_users = [c["name"] for c in inspector.get_columns("users")]
        is_postgresql = connection.dialect.name == "postgresql"
        datetime_type = "TIMESTAMP WITH TIME ZONE" if is_postgresql else "DATETIME"
        
        new_cols_users = {
            "last_ip_address": "VARCHAR(64)",
            "last_active_at": datetime_type,
            "daily_active_seconds": "INTEGER DEFAULT 0",
            "active_date": "VARCHAR(10)"
        }
        for col_name, col_type in new_cols_users.items():
            if col_name not in columns_users:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                logger.info(f"Database migration: Added column '{col_name}' to users table.")

        # 2. notifications table
        columns_notifs = [c["name"] for c in inspector.get_columns("notifications")]
        if "notification_type" not in columns_notifs:
            connection.execute(text("ALTER TABLE notifications ADD COLUMN notification_type VARCHAR(32) DEFAULT 'message'"))
            logger.info("Database migration: Added column 'notification_type' to notifications table.")
            
        if is_postgresql:
            for col in ["alert_id", "master_item_id", "target_value"]:
                col_info = next((c for c in inspector.get_columns("notifications") if c["name"] == col), None)
                if col_info and not col_info.get("nullable", True):
                    connection.execute(text(f"ALTER TABLE notifications ALTER COLUMN {col} DROP NOT NULL"))
                    logger.info(f"Database migration: Dropped NOT NULL constraint on notifications.{col}")

        # 3. master_items table
        columns_items = [c["name"] for c in inspector.get_columns("master_items")]
        if "image_data" not in columns_items:
            binary_type = "BYTEA" if is_postgresql else "BLOB"
            connection.execute(text(f"ALTER TABLE master_items ADD COLUMN image_data {binary_type}"))
            logger.info("Database migration: Added column 'image_data' to master_items table.")

    try:
        async with engine.begin() as conn:
            await conn.run_sync(add_missing_columns)
    except Exception as exc:
        logger.error("Database migration: Failed to auto-add missing columns: %s", exc)

    async with AsyncSessionLocal() as session:
        # Seed settings
        for key, value in DEFAULT_SETTINGS.items():
            existing = await session.get(AppSetting, key)
            if existing is None:
                session.add(AppSetting(key=key, value=value))
        
        # Seed default admin user
        from app.db.models import User
        from app.core.security import hash_password
        from sqlalchemy import select
        
        result = await session.execute(select(User).where(User.username == "admin"))
        admin_user = result.scalar_one_or_none()
        if admin_user is None:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                password_hash=hash_password("admin"),
                role="admin",
                email_verified=True,
                is_active=True,
            )
            session.add(admin_user)
            logger.info("Default admin user created (username: admin, password: admin).")
            
        await session.commit()
    logger.info("Default app_settings and admin user seeded.")


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
