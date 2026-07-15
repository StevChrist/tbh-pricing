"""
APScheduler async scheduler for periodic price refresh and database updates.
"""

from __future__ import annotations

import logging
import json
import asyncio
from datetime import datetime, timezone
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select, func

from app.core import alert_checker
from app.core.steam import SteamMarketClient
from app.db import crud
from app.db.database import AsyncSessionLocal
from app.db.models import MasterItem, MarketSummary, PriceHistory

logger = logging.getLogger(__name__)

_JOB_ID = "refresh_all_inventory_prices"


async def sync_all_steam_prices(db: AsyncSession) -> dict:
    """
    Fetch all items listed on the Steam Market for our app ID,
    match them with database MasterItems, update MarketSummary,
    and insert PriceHistory snapshots for updated items.
    """
    from app.core.matcher import find_wiki_match
    
    logger.info("Starting bulk Steam price synchronization from search render.")
    steam_items = []
    async with SteamMarketClient() as steam_client:
        try:
            steam_items = await steam_client.get_all_market_items()
        except Exception as steam_err:
            logger.error("Steam search/render failed during price sync: %s", steam_err)
            return {"refreshed": 0, "errors": 1, "total": 0}

    if not steam_items:
        logger.info("No items retrieved from Steam Market search.")
        return {"refreshed": 0, "errors": 0, "total": 0}

    refreshed = 0
    # Fetch all database items to match against
    result = await db.execute(select(MasterItem))
    db_items_list = result.scalars().all()

    for s_item in steam_items:
        matched_wiki = find_wiki_match(s_item, [
            {
                "key": item.internal_item_id,
                "name": item.display_name,
                "market_hash_name": item.market_hash_name,
                "grade": item.rarity.value if item.rarity else "",
                "variant": (item.item_metadata or {}).get("variant")
            } for item in db_items_list
        ])
        
        if matched_wiki:
            db_item = next(i for i in db_items_list if i.internal_item_id == matched_wiki["key"])
            
            # Ensure market_hash_name is populated
            if not db_item.market_hash_name:
                db_item.market_hash_name = s_item["market_hash_name"]

            latest_usd = s_item.get("latest_price_usd")
            latest_idr = s_item.get("latest_price_idr")
            volume = s_item.get("volume")
            market_url = s_item.get("market_url")

            # Update MarketSummary
            await crud.upsert_market_summary(
                db,
                master_item_id=db_item.id,
                market_hash_name=s_item["market_hash_name"],
                latest_price_idr=latest_idr,
                latest_price_usd=latest_usd,
                median_price_idr=None,
                median_price_usd=None,
                volume=volume,
                market_status="ok",
                market_url=market_url,
            )

            # Insert into PriceHistory ONLY if price/listings changed from latest
            prev_snapshot = await crud.get_latest_price(db, db_item.id)
            price_changed = (
                prev_snapshot is None or
                prev_snapshot.lowest_price_usd != latest_usd or
                prev_snapshot.volume != volume or
                prev_snapshot.fetch_status != "ok"
            )
            
            if price_changed:
                snapshot = await crud.create_price_snapshot(
                    db,
                    master_item_id=db_item.id,
                    lowest_price_idr=latest_idr,
                    median_price_idr=None,
                    lowest_price_usd=latest_usd,
                    median_price_usd=None,
                    volume=volume,
                    fetch_status="ok"
                )
                refreshed += 1
                await alert_checker.check_alerts_for_item(
                    db, db_item.id, snapshot, prev_snapshot
                )

    await db.commit()
    return {"refreshed": refreshed, "total": len(steam_items), "errors": 0}


async def refresh_all_inventory_prices() -> None:
    """
    Scheduled job: Sync Steam prices for all catalog items bulk-paginated
    every 30 minutes, ensuring the database is always updated.
    """
    logger.info("Scheduler: starting price refresh job.")
    async with AsyncSessionLocal() as db:
        # Check if another refresh/sync is running
        is_running = (await crud.get_setting(db, "is_running") or "false").lower() == "true"
        if is_running:
            logger.warning("Scheduler: Another price refresh or ETL synchronization is in progress. Skipping.")
            return

        # Mark as running
        await crud.set_setting(db, "is_running", "true")
        await db.commit()

        try:
            res = await sync_all_steam_prices(db)
            refreshed = res.get("refreshed", 0)
            total = res.get("total", 0)
            errors = res.get("errors", 0)
            
            now = datetime.now(timezone.utc).isoformat()
            await crud.set_setting(db, "last_run_at", now)
            await crud.set_setting(db, "items_refreshed_last_run", str(refreshed))
            await db.commit()

            await alert_checker.expire_old_alerts(db)
            await db.commit()

            await crud.log_activity(
                db,
                user_id=None,
                username="system_scheduler",
                action="price_sync",
                details=f"Price refresh complete — synced total={total} (refreshed={refreshed} errors={errors})",
                ip_address="127.0.0.1"
            )
            await db.commit()
        except Exception as exc:
            logger.error("Scheduler: failed to execute bulk price sync: %s", exc, exc_info=True)
        finally:
            await crud.set_setting(db, "is_running", "false")
            await db.commit()


async def run_daily_market_sync(mode: str = "daily") -> None:
    """Invokes the new ETL synchronization pipeline from the scheduler."""
    logger.info("Scheduler: starting daily sync job (mode=%s).", mode)
    async with AsyncSessionLocal() as db:
        # Overlap guard
        is_running = (await crud.get_setting(db, "is_running") or "false").lower() == "true"
        if is_running:
            logger.warning("Scheduler: Synchronization aborted. Another job is already running.")
            return

        await crud.set_setting(db, "is_running", "true")
        await db.commit()

        try:
            from app.core.sync_service import run_synchronization
            result = await run_synchronization(db, mode=mode)
            logger.info("Scheduler: daily sync job completed successfully with result: %s", result)
            
            details_str = f"Found: {result.get('items_found', 0)}, Inserted: {result.get('items_inserted', 0)}, Skipped: {result.get('items_skipped', 0)}" if isinstance(result, dict) else str(result)
            await crud.log_activity(
                db,
                user_id=None,
                username="system_scheduler",
                action="market_sync",
                details=f"Daily Steam Market sync ({mode}) completed. {details_str}",
                ip_address="127.0.0.1"
            )
            await db.commit()
        except Exception as exc:
            logger.error("Scheduler: daily sync job encountered error: %s", exc, exc_info=True)
            await crud.log_activity(
                db,
                user_id=None,
                username="system_scheduler",
                action="market_sync_failed",
                details=f"Daily Steam Market sync ({mode}) failed: {str(exc)}",
                ip_address="127.0.0.1"
            )
            await db.commit()
        finally:
            await crud.set_setting(db, "is_running", "false")
            await db.commit()


async def run_startup_jobs() -> None:
    """
    Coordinated startup task:
    1. Seed the database with master items if empty.
    2. Otherwise, trigger an immediate price refresh to ensure prices are up to date on startup.
    3. Clean up old activity logs.
    """
    # Wait a brief moment to allow the server to start listening to requests
    await asyncio.sleep(1)
    
    async with AsyncSessionLocal() as db:
        try:
            # Run cleanup logs at startup
            rows = await crud.cleanup_activity_logs(db)
            await db.commit()
            logger.info("Startup: Cleaned up %d old activity logs.", rows)
        except Exception as exc:
            logger.error("Startup: Failed to clean up activity logs: %s", exc)

        try:
            result = await db.execute(select(func.count()).select_from(MasterItem))
            count = result.scalar() or 0
            if count == 0:
                logger.info("Startup: master_items table is empty, triggering initial full seeding...")
                await run_daily_market_sync(mode="full")
            else:
                logger.info("Startup: master_items table populated with %d items. Database is ready.", count)
        except Exception as exc:
            logger.error("Startup: error executing startup jobs: %s", exc)


async def cleanup_old_logs_job() -> None:
    """Scheduled task to delete activity logs older than 3 months (90 days) and expired OTPs."""
    logger.info("Scheduler: running activity logs and expired OTPs cleanup job.")
    async with AsyncSessionLocal() as db:
        try:
            rows = await crud.cleanup_activity_logs(db)
            await db.commit()
            logger.info("Scheduler: cleaned up %d old activity logs.", rows)
        except Exception as exc:
            logger.error("Scheduler: failed to clean up old activity logs: %s", exc)

        try:
            from app.services import otp_service
            otp_rows = await otp_service.cleanup(db)
            await db.commit()
            if otp_rows:
                logger.info("Scheduler: cleaned up %d expired OTP record(s).", otp_rows)
        except Exception as exc:
            logger.error("Scheduler: failed to clean up expired OTPs: %s", exc)


def create_scheduler(interval_minutes: int = 30) -> AsyncIOScheduler:
    """Create and configure the APScheduler instance."""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        refresh_all_inventory_prices,
        trigger="cron",
        minute="0,30",
        id=_JOB_ID,
        name="Refresh All Inventory Prices",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=60,
    )
    # Add daily seeding job (once every 24 hours at 2:00 AM)
    scheduler.add_job(
        run_daily_market_sync,
        trigger="cron",
        hour=2,
        minute=0,
        id="daily_market_seed",
        name="Daily Steam Market Seeding",
        replace_existing=True,
        max_instances=1,
    )
    # Add weekly full seeding job (once every Sunday at 4:00 AM)
    scheduler.add_job(
        run_daily_market_sync,
        trigger="cron",
        day_of_week="sun",
        hour=4,
        minute=0,
        args=["full"],
        id="weekly_full_market_sync",
        name="Weekly Full Steam Market Synchronization",
        replace_existing=True,
        max_instances=1,
    )
    # Add daily logs cleanup job (once every 24 hours at 3:00 AM)
    scheduler.add_job(
        cleanup_old_logs_job,
        trigger="cron",
        hour=3,
        minute=0,
        id="cleanup_old_logs",
        name="Clean up old activity logs",
        replace_existing=True,
        max_instances=1,
    )
    return scheduler
