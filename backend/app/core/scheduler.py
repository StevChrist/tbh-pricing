"""
APScheduler async scheduler for periodic price refresh and database updates.

Price sync strategy (CORRECTED):
  - Steam Search/Render returns 100 items per page.
  - ~935 tradable items = ~10 pages × 3 sec delay = ~30 seconds total per run.
  - ONE full sync run every 30 minutes at :00 and :30 — ALL tradable items updated.
  - No batch rotation needed: 10 requests per run is well within Steam rate limits.
  - On startup: immediately trigger a full price sync after catalog is verified.
  - Steam priceoverview endpoint is NEVER called by this scheduler.
"""

from __future__ import annotations

import logging
import asyncio
import math
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, func

from app.core import alert_checker
from app.core.steam import SteamMarketClient, _get_usd_to_idr_rate, SEARCH_RENDER_URL
from app.db import crud
from app.db.database import AsyncSessionLocal
from app.db.models import MasterItem

logger = logging.getLogger(__name__)

_JOB_ID = "price_full_sync"


# ---------------------------------------------------------------------------
# Core full sync logic — all tradable items in one run
# ---------------------------------------------------------------------------


async def run_price_full_sync() -> None:
    """
    Scheduled job: runs every 30 minutes at :00 and :30.

    Fetches prices for ALL tradable items (~935) from the Steam Market
    Search/Render API in a single run (~10 pages, ~30 seconds).
    Updates MarketSummary cache and inserts PriceHistory snapshots.

    No batch rotation — one run covers everything.
    """
    logger.info("Scheduler: starting full price sync.")

    async with AsyncSessionLocal() as db:
        # Guard: skip if another job is already running
        is_running = (await crud.get_setting(db, "is_running") or "false").lower() == "true"
        if is_running:
            logger.warning("Scheduler: another sync is in progress — skipping.")
            return

        await crud.set_setting(db, "is_running", "true")
        await db.commit()

        try:
            # --- Load all tradable items from DB (build lookup map) ---
            total_tradable = await crud.get_tradable_items_count(db)
            if total_tradable == 0:
                logger.info("Scheduler: no tradable items in DB — skipping price sync.")
                return

            # Fetch all tradable items in one query (paginate internally if needed)
            db_items = await crud.get_tradable_items_batch(db, offset=0, limit=total_tradable)

            # market_hash_name → MasterItem lookup
            hash_to_item: dict[str, MasterItem] = {
                item.market_hash_name: item
                for item in db_items
                if item.market_hash_name
            }
            remaining_hashes = set(hash_to_item.keys())

            logger.info(
                "Scheduler: syncing %d tradable items (~%d Steam pages).",
                len(hash_to_item),
                math.ceil(len(hash_to_item) / 100),
            )

            # --- Paginate through Steam Search/Render to collect all prices ---
            rate = await _get_usd_to_idr_rate()
            matched_prices: list[dict] = []
            steam_fetch_success = False

            async with SteamMarketClient() as steam_client:
                start = 0
                page_size = 100

                while True:
                    params = {
                        "appid": 3678970,
                        "norender": 1,
                        "start": start,
                        "count": page_size,
                        "currency": 1,  # USD
                    }

                    response = await steam_client._get_with_backoff(SEARCH_RENDER_URL, params)
                    if response is None:
                        logger.warning(
                            "Scheduler: Steam Search/Render returned None at start=%d — stopping.", start
                        )
                        break

                    try:
                        data = response.json()
                    except Exception as exc:
                        logger.error("Scheduler: Failed to parse Steam JSON at start=%d: %s", start, exc)
                        break

                    results = data.get("results", [])
                    total_count = data.get("total_count", 0)

                    # Match each Steam result against our tradable DB items
                    for raw in results:
                        hash_name = raw.get("hash_name", raw.get("name", ""))
                        if hash_name not in remaining_hashes:
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
                        remaining_hashes.discard(hash_name)

                    logger.info(
                        "Scheduler: page start=%d — matched %d/%d items so far.",
                        start, len(matched_prices), len(hash_to_item),
                    )

                    if not results:
                        logger.info("Scheduler: no results at start=%d (total=%d) — done.", start, total_count)
                        steam_fetch_success = True
                        break

                    start += len(results)

                    # Stop when we've passed Steam's total or matched everything
                    if start >= total_count:
                        steam_fetch_success = True
                        break
                    if not remaining_hashes:
                        steam_fetch_success = True
                        break

            # Only mark the remaining unmatched items as unavailable if we completed a full sync scan
            if steam_fetch_success:
                # Items not found on Steam → mark as unavailable in cache
                for missing_hash in remaining_hashes:
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
            else:
                logger.warning(
                    "Scheduler: Steam search/render did not complete successfully. "
                    "Remaining %d items will keep their last known cached prices.",
                    len(remaining_hashes)
                )

            # --- Bulk upsert prices into MarketSummary ---
            updated_count = 0
            if matched_prices:
                updated_count = await crud.bulk_upsert_market_prices(db, matched_prices)
                await db.commit()

            # --- Insert PriceHistory snapshots only for changed prices ---
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

            # Expire old alerts
            await alert_checker.expire_old_alerts(db)
            await db.commit()

            # Update settings
            now_str = datetime.now(timezone.utc).isoformat()
            await crud.set_setting(db, "last_run_at", now_str)
            await crud.set_setting(db, "items_refreshed_last_run", str(updated_count))
            await db.commit()

            logger.info(
                "Scheduler: full price sync complete — updated=%d, snapshots=%d, unavailable=%d.",
                len([p for p in matched_prices if p["market_status"] == "ok"]),
                snapshot_count,
                len([p for p in matched_prices if p["market_status"] == "unavailable"]),
            )

            await crud.log_activity(
                db,
                user_id=None,
                username="system_scheduler",
                action="price_sync",
                details=(
                    f"Full price sync complete: "
                    f"updated={updated_count}, "
                    f"ok={len([p for p in matched_prices if p['market_status'] == 'ok'])}, "
                    f"unavailable={len([p for p in matched_prices if p['market_status'] == 'unavailable'])}, "
                    f"snapshots={snapshot_count}"
                ),
                ip_address="127.0.0.1",
            )
            await db.commit()

        except Exception as exc:
            logger.error("Scheduler: full price sync failed: %s", exc, exc_info=True)
        finally:
            await crud.set_setting(db, "is_running", "false")
            await db.commit()


# ---------------------------------------------------------------------------
# Compatibility shim for manual /prices/refresh endpoint
# ---------------------------------------------------------------------------


async def sync_all_steam_prices(db) -> dict:
    """
    Triggered by the manual /prices/refresh API endpoint.
    Runs a full sync immediately, then returns stats from settings.
    """
    await run_price_full_sync()
    refreshed = int(await crud.get_setting(db, "items_refreshed_last_run") or 0)
    return {"refreshed": refreshed, "total": refreshed, "errors": 0}


# ---------------------------------------------------------------------------
# Daily catalog sync (item seeding from wiki/Steam)
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
# Startup jobs — seed catalog + immediate first price sync
# ---------------------------------------------------------------------------


async def run_startup_jobs() -> None:
    """
    Coordinated startup task:
    1. Clean up old activity logs.
    2. Seed master_items if table is empty (only on first boot).
    Price sync is handled by the cron job at :00 and :30 — no immediate sync
    on startup to avoid hitting Steam rate limits after restarts.
    """
    await asyncio.sleep(2)  # brief pause for DB connections to settle

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
                logger.info(
                    "Startup: master_items table populated with %d items. "
                    "Price sync will run at next scheduled :00 or :30 mark.",
                    count,
                )
        except Exception as exc:
            logger.error("Startup: error checking master_items: %s", exc)



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

    # Full price sync: every 30 minutes exactly at :00 and :30
    # (~935 items = ~10 Search/Render pages = ~30 sec per run)
    scheduler.add_job(
        run_price_full_sync,
        trigger="cron",
        minute="0,30",
        id=_JOB_ID,
        name="Full Price Sync (all tradable items)",
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
