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


async def refresh_all_inventory_prices() -> None:
    """
    Scheduled job: refresh Steam prices for all inventoried items.

    Steps:
    1. Load delay setting from app_settings.
    2. Query all distinct master_item_ids across all users.
    3. Fetch IDR + USD prices with enforced asyncio.sleep(3) per item.
    4. Update market_summary table.
    5. Write price_history snapshot ONLY if price changes.
    6. Run alert checker per item.
    """
    logger.info("Scheduler: starting price refresh job.")
    refreshed = unavailable = errors = 0

    async with AsyncSessionLocal() as db:
        # Check if another refresh/sync is running
        is_running = (await crud.get_setting(db, "is_running") or "false").lower() == "true"
        if is_running:
            logger.warning("Scheduler: Another price refresh or ETL synchronization is in progress. Skipping.")
            return

        # Mark as running
        await crud.set_setting(db, "is_running", "true")
        await db.commit()

        delay = int(await crud.get_setting(db, "steam_request_delay_seconds") or 3)
        master_ids = await crud.get_all_inventory_master_ids(db)

        if not master_ids:
            logger.info("Scheduler: no inventory items found — skipping refresh.")
            await crud.set_setting(db, "is_running", "false")
            await db.commit()
            return

        logger.info("Scheduler: refreshing %d items.", len(master_ids))

        try:
            async with SteamMarketClient(request_delay=delay) as client:
                for mid in master_ids:
                    item = await crud.get_master_item_by_id(db, mid)
                    if not item or not item.market_hash_name:
                        continue
                    try:
                        result = await client.get_item_price(item.market_hash_name)
                        if result is None:
                            errors += 1
                            # Error record in price_history
                            await crud.create_price_snapshot(
                                db, mid, None, None, None, None, None, "error"
                            )
                        else:
                            if result["fetch_status"] == "unavailable":
                                unavailable += 1
                            else:
                                refreshed += 1

                            latest_usd = result["lowest_price_usd"]
                            latest_idr = result["lowest_price_idr"]
                            volume = result["volume"]
                            now_ts = datetime.now(timezone.utc)

                            # 1. Update MarketSummary
                            await crud.upsert_market_summary(
                                db,
                                master_item_id=mid,
                                market_hash_name=item.market_hash_name,
                                latest_price_idr=latest_idr,
                                latest_price_usd=latest_usd,
                                median_price_idr=result["median_price_idr"],
                                median_price_usd=result["median_price_usd"],
                                volume=volume,
                                market_status=result["fetch_status"],
                            )

                            # 2. Compare against PriceHistory and insert only if changed
                            prev_snapshot = await crud.get_latest_price(db, mid)
                            price_changed = (
                                prev_snapshot is None or
                                prev_snapshot.lowest_price_usd != latest_usd or
                                prev_snapshot.volume != volume or
                                prev_snapshot.fetch_status != result["fetch_status"]
                            )

                            if price_changed:
                                snapshot = await crud.create_price_snapshot(
                                    db,
                                    mid,
                                    latest_idr,
                                    result["median_price_idr"],
                                    latest_usd,
                                    result["median_price_usd"],
                                    volume,
                                    result["fetch_status"],
                                )
                                await alert_checker.check_alerts_for_item(
                                    db, mid, snapshot, prev_snapshot
                                )
                        await db.commit()
                    except Exception as exc:
                        logger.error(
                            "Scheduler: error refreshing master_item_id=%d: %s", mid, exc
                        )
                        errors += 1

            # Update stats
            now = datetime.now(timezone.utc).isoformat()
            await crud.set_setting(db, "last_run_at", now)
            await crud.set_setting(db, "items_refreshed_last_run", str(refreshed))
            await crud.set_setting(db, "items_unavailable_last_run", str(unavailable))
            await db.commit()

            await alert_checker.expire_old_alerts(db)
            await db.commit()

        finally:
            await crud.set_setting(db, "is_running", "false")
            await db.commit()

    logger.info(
        "Scheduler: refresh complete — refreshed=%d unavailable=%d errors=%d",
        refreshed,
        unavailable,
        errors,
    )


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
        except Exception as exc:
            logger.error("Scheduler: daily sync job encountered error: %s", exc, exc_info=True)
        finally:
            await crud.set_setting(db, "is_running", "false")
            await db.commit()


async def run_startup_jobs() -> None:
    """
    Coordinated startup task:
    1. Seed the database with master items if empty.
    2. Otherwise, trigger an immediate price refresh to ensure prices are up to date on startup.
    """
    # Wait a brief moment to allow the server to start listening to requests
    await asyncio.sleep(1)
    
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(func.count()).select_from(MasterItem))
            count = result.scalar() or 0
            if count == 0:
                logger.info("Startup: master_items table is empty, triggering initial full seeding...")
                await run_daily_market_sync(mode="full")
            else:
                logger.info("Startup: master_items table populated with %d items. Triggering immediate price refresh...", count)
                await refresh_all_inventory_prices()
        except Exception as exc:
            logger.error("Startup: error executing startup jobs: %s", exc)


def create_scheduler(interval_minutes: int = 30) -> AsyncIOScheduler:
    """Create and configure the APScheduler instance."""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        refresh_all_inventory_prices,
        trigger=IntervalTrigger(minutes=interval_minutes),
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
    return scheduler
