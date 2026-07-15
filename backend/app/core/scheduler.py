"""
APScheduler async scheduler for periodic price refresh and database updates.

Price sync strategy:
  - All tradable items (~935) are divided into BATCH_SIZE chunks (default 300).
  - One batch is fetched from Steam Market Search/Render every 15 minutes.
  - Batch index rotates: 0 → 1 → 2 → ... → N → 0 → ...
  - Users always read prices from the MarketSummary DB cache — never from Steam directly.
  - Steam priceoverview endpoint is NEVER called by the scheduler.
"""

from __future__ import annotations

import logging
import asyncio
import math
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, func

from app.core import alert_checker
from app.core.steam import SteamMarketClient, _get_usd_to_idr_rate
from app.db import crud
from app.db.database import AsyncSessionLocal
from app.db.models import MasterItem

logger = logging.getLogger(__name__)

_JOB_ID = "price_batch_sync"

# Number of tradable items fetched per batch run (every 15 min)
BATCH_SIZE = 300


# ---------------------------------------------------------------------------
# Core batch sync logic
# ---------------------------------------------------------------------------


async def run_price_batch_sync() -> None:
    """
    Scheduled job running every 15 minutes.

    Fetches one batch of tradable items from the Steam Market Search/Render API
    and updates the MarketSummary price cache in the database.

    Batch rotation:
      - Reads current batch_index from app_settings.
      - Fetches BATCH_SIZE items at that offset from master_items WHERE market_hash_name IS NOT NULL.
      - Calls Steam Search/Render for each page of 100 items in this batch.
      - Writes updated prices to market_summary via bulk_upsert_market_prices().
      - Inserts PriceHistory snapshots only if price changed.
      - Advances batch_index mod total_batches.
    """
    logger.info("Scheduler: starting price batch sync job.")

    async with AsyncSessionLocal() as db:
        # Guard: skip if another job is already running
        is_running = (await crud.get_setting(db, "is_running") or "false").lower() == "true"
        if is_running:
            logger.warning("Scheduler: another sync is in progress — skipping price batch.")
            return

        await crud.set_setting(db, "is_running", "true")
        await db.commit()

        try:
            # --- Determine batch parameters ---
            total_tradable = await crud.get_tradable_items_count(db)
            if total_tradable == 0:
                logger.info("Scheduler: no tradable items found — skipping.")
                return

            total_batches = max(1, math.ceil(total_tradable / BATCH_SIZE))
            batch_index = int(await crud.get_setting(db, "sync_batch_index") or 0)
            batch_index = batch_index % total_batches  # safety clamp
            offset = batch_index * BATCH_SIZE

            logger.info(
                "Scheduler: batch %d/%d (offset=%d, size=%d, total_tradable=%d).",
                batch_index + 1, total_batches, offset, BATCH_SIZE, total_tradable,
            )

            # --- Load this batch of items from DB ---
            db_items = await crud.get_tradable_items_batch(db, offset=offset, limit=BATCH_SIZE)
            if not db_items:
                logger.info("Scheduler: batch %d returned no items — advancing index.", batch_index)
                next_index = (batch_index + 1) % total_batches
                await crud.set_setting(db, "sync_batch_index", str(next_index))
                await db.commit()
                return

            # Build lookup: market_hash_name → MasterItem
            hash_to_item: dict[str, MasterItem] = {
                item.market_hash_name: item
                for item in db_items
                if item.market_hash_name
            }
            target_hashes = set(hash_to_item.keys())

            # --- Fetch prices from Steam Search/Render API ---
            rate = await _get_usd_to_idr_rate()
            matched_prices: list[dict] = []

            async with SteamMarketClient() as steam_client:
                # Search Render returns 100 items per page — paginate within batch
                start = 0
                page_size = 100
                consecutive_empty = 0

                while start < len(db_items) + page_size:
                    params = {
                        "appid": 3678970,
                        "norender": 1,
                        "start": start,
                        "count": page_size,
                        "currency": 1,  # USD
                    }
                    from app.core.steam import SEARCH_RENDER_URL
                    response = await steam_client._get_with_backoff(SEARCH_RENDER_URL, params)
                    if response is None:
                        logger.warning("Scheduler: Steam search/render returned None at start=%d — stopping batch.", start)
                        break

                    try:
                        data = response.json()
                    except Exception as exc:
                        logger.error("Scheduler: Failed to parse Steam JSON at start=%d: %s", start, exc)
                        break

                    results = data.get("results", [])
                    total_count = data.get("total_count", 0)

                    if not results:
                        consecutive_empty += 1
                        if consecutive_empty >= 2:
                            break
                        start += page_size
                        continue

                    consecutive_empty = 0

                    # Match results against our batch's target hashes
                    for raw in results:
                        hash_name = raw.get("hash_name", raw.get("name", ""))
                        if hash_name not in target_hashes:
                            continue

                        parsed = await steam_client.parse_market_search_result(raw, rate)
                        db_item = hash_to_item[hash_name]
                        matched_prices.append({
                            "master_item_id": db_item.id,
                            "market_hash_name": hash_name,
                            "latest_price_usd": parsed.get("latest_price_usd"),
                            "latest_price_idr": parsed.get("latest_price_idr"),
                            "volume": parsed.get("volume"),
                            "market_status": "ok",
                            "market_url": parsed.get("market_url"),
                        })
                        # Remove from target set once matched
                        target_hashes.discard(hash_name)

                    start += len(results)

                    # Stop paginating once all targets are matched, or past total
                    if start >= total_count or not target_hashes:
                        break

            # Items in target_hashes that were NOT found on Steam → mark unavailable
            for missing_hash in target_hashes:
                db_item = hash_to_item[missing_hash]
                matched_prices.append({
                    "master_item_id": db_item.id,
                    "market_hash_name": missing_hash,
                    "latest_price_usd": None,
                    "latest_price_idr": None,
                    "volume": None,
                    "market_status": "unavailable",
                    "market_url": None,
                })

            # --- Bulk update DB prices ---
            updated_count = 0
            if matched_prices:
                updated_count = await crud.bulk_upsert_market_prices(db, matched_prices)
                await db.commit()

            # --- Insert PriceHistory snapshots for changed prices ---
            snapshot_count = 0
            for price_data in matched_prices:
                mid = price_data["master_item_id"]
                prev = await crud.get_latest_price(db, mid)

                new_usd = price_data.get("latest_price_usd")
                new_vol = price_data.get("volume")
                new_status = price_data.get("market_status", "ok")

                price_changed = (
                    prev is None
                    or prev.lowest_price_usd != new_usd
                    or prev.volume != new_vol
                    or prev.fetch_status != new_status
                )

                if price_changed:
                    snapshot = await crud.create_price_snapshot(
                        db,
                        master_item_id=mid,
                        lowest_price_idr=price_data.get("latest_price_idr"),
                        median_price_idr=None,
                        lowest_price_usd=new_usd,
                        median_price_usd=None,
                        volume=new_vol,
                        fetch_status=new_status,
                    )
                    snapshot_count += 1
                    await alert_checker.check_alerts_for_item(db, mid, snapshot, prev)

            if snapshot_count:
                await db.commit()

            # --- Expire old alerts ---
            await alert_checker.expire_old_alerts(db)
            await db.commit()

            # --- Advance batch index for next run ---
            next_index = (batch_index + 1) % total_batches
            now_str = datetime.now(timezone.utc).isoformat()
            await crud.set_setting(db, "sync_batch_index", str(next_index))
            await crud.set_setting(db, "last_run_at", now_str)
            await crud.set_setting(db, "items_refreshed_last_run", str(updated_count))
            await db.commit()

            logger.info(
                "Scheduler: batch %d/%d complete — updated=%d snapshots=%d next_batch=%d.",
                batch_index + 1, total_batches, updated_count, snapshot_count, next_index + 1,
            )

            await crud.log_activity(
                db,
                user_id=None,
                username="system_scheduler",
                action="price_sync",
                details=(
                    f"Price batch {batch_index + 1}/{total_batches} complete "
                    f"(updated={updated_count}, snapshots={snapshot_count})"
                ),
                ip_address="127.0.0.1",
            )
            await db.commit()

        except Exception as exc:
            logger.error("Scheduler: price batch sync failed: %s", exc, exc_info=True)
        finally:
            await crud.set_setting(db, "is_running", "false")
            await db.commit()


# ---------------------------------------------------------------------------
# Legacy alias for manual /prices/refresh endpoint
# (now reads from DB instead of calling Steam)
# ---------------------------------------------------------------------------


async def sync_all_steam_prices(db) -> dict:
    """
    Compatibility shim — triggers a full batch sync run from the current batch index.
    Called by the manual /prices/refresh endpoint.
    Does NOT call priceoverview. Uses Search/Render only.
    """
    await run_price_batch_sync()
    refreshed = int(await crud.get_setting(db, "items_refreshed_last_run") or 0)
    return {"refreshed": refreshed, "total": refreshed, "errors": 0}


# ---------------------------------------------------------------------------
# Daily catalog sync
# ---------------------------------------------------------------------------


async def run_daily_market_sync(mode: str = "daily") -> None:
    """Invokes the ETL synchronization pipeline (catalog item seeding) from the scheduler."""
    logger.info("Scheduler: starting daily sync job (mode=%s).", mode)
    async with AsyncSessionLocal() as db:
        is_running = (await crud.get_setting(db, "is_running") or "false").lower() == "true"
        if is_running:
            logger.warning("Scheduler: Synchronization aborted. Another job is already running.")
            return

        await crud.set_setting(db, "is_running", "true")
        await db.commit()

        try:
            from app.core.sync_service import run_synchronization
            result = await run_synchronization(db, mode=mode)
            logger.info("Scheduler: daily sync completed: %s", result)

            details_str = (
                f"Found: {result.get('items_found', 0)}, "
                f"Inserted: {result.get('items_inserted', 0)}, "
                f"Skipped: {result.get('items_skipped', 0)}"
            ) if isinstance(result, dict) else str(result)

            await crud.log_activity(
                db,
                user_id=None,
                username="system_scheduler",
                action="market_sync",
                details=f"Daily Steam Market sync ({mode}) completed. {details_str}",
                ip_address="127.0.0.1",
            )
            await db.commit()
        except Exception as exc:
            logger.error("Scheduler: daily sync error: %s", exc, exc_info=True)
            await crud.log_activity(
                db,
                user_id=None,
                username="system_scheduler",
                action="market_sync_failed",
                details=f"Daily Steam Market sync ({mode}) failed: {exc}",
                ip_address="127.0.0.1",
            )
            await db.commit()
        finally:
            await crud.set_setting(db, "is_running", "false")
            await db.commit()


# ---------------------------------------------------------------------------
# Startup jobs
# ---------------------------------------------------------------------------


async def run_startup_jobs() -> None:
    """
    Coordinated startup task:
    1. Clean up old activity logs.
    2. Seed master_items if table is empty.
    """
    await asyncio.sleep(1)

    async with AsyncSessionLocal() as db:
        try:
            rows = await crud.cleanup_activity_logs(db)
            await db.commit()
            logger.info("Startup: Cleaned up %d old activity logs.", rows)
        except Exception as exc:
            logger.error("Startup: Failed to clean up activity logs: %s", exc)

        try:
            result = await db.execute(select(func.count()).select_from(MasterItem))
            count = result.scalar() or 0
            if count == 0:
                logger.info("Startup: master_items empty — triggering initial full seeding.")
                await run_daily_market_sync(mode="full")
            else:
                logger.info("Startup: master_items table populated with %d items. Database is ready.", count)
        except Exception as exc:
            logger.error("Startup: error executing startup jobs: %s", exc)


# ---------------------------------------------------------------------------
# Cleanup job
# ---------------------------------------------------------------------------


async def cleanup_old_logs_job() -> None:
    """Scheduled task to delete old activity logs and expired OTPs."""
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


# ---------------------------------------------------------------------------
# Scheduler factory
# ---------------------------------------------------------------------------


def create_scheduler(interval_minutes: int = 30) -> AsyncIOScheduler:
    """Create and configure the APScheduler instance."""
    scheduler = AsyncIOScheduler()

    # Price batch sync: every 15 minutes at :00, :15, :30, :45
    scheduler.add_job(
        run_price_batch_sync,
        trigger="cron",
        minute="0,15,30,45",
        id=_JOB_ID,
        name="Price Batch Sync (rotating)",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=120,
    )

    # Daily catalog seeding at 2:00 AM
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

    # Weekly full catalog sync every Sunday at 4:00 AM
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

    # Daily logs cleanup at 3:00 AM
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
