"""
Prices routes: latest snapshot, history chart, manual refresh.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core import alert_checker
from app.core.steam import SteamMarketClient
from app.db import crud
from app.db.database import AsyncSessionLocal, get_db
from app.db.models import User
from app.schemas.prices import PriceHistoryPoint, PriceSnapshot, PriceStatus, RefreshResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prices", tags=["prices"])


@router.get("/status", response_model=PriceStatus)
async def get_price_status(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PriceStatus:
    """Return the timestamp of the last database sync and fetch status stats."""
    settings = await crud.get_all_settings(db)
    return PriceStatus(
        last_run_at=settings.get("last_refresh_timestamp"),
        items_synced_last_run=int(settings.get("items_synced_last_run", 0)),
        items_failed_last_run=int(settings.get("items_failed_last_run", 0)),
        items_unavailable_last_run=int(settings.get("items_unavailable_last_run", 0)),
    )


@router.get("/{master_item_id}", response_model=PriceSnapshot)
async def get_latest_price(
    master_item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PriceSnapshot:
    """
    Return the most recent price snapshot for a master item (IDR + USD).
    Returns 404 if no price data exists yet for this item.
    """
    item = await crud.get_master_item_by_id(db, master_item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Master item not found")

    price = await crud.get_latest_price(db, master_item_id)
    if not price:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No price data available yet. Run a refresh first.",
        )
    return PriceSnapshot(
        id=price.id or price.master_item_id,
        master_item_id=price.master_item_id,
        lowest_price_idr=price.lowest_price_idr,
        median_price_idr=price.median_price_idr,
        lowest_price_usd=price.lowest_price_usd,
        median_price_usd=price.median_price_usd,
        volume=price.volume,
        fetch_status=price.fetch_status,
        fetched_at=price.fetched_at or datetime.now(timezone.utc),
    )


@router.get("/{master_item_id}/history", response_model=list[PriceHistoryPoint])
async def get_price_history(
    master_item_id: int,
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[PriceHistoryPoint]:
    """
    Return price history for a master item over the past N days.
    Used to render the dual-axis line chart (IDR + USD).
    """
    item = await crud.get_master_item_by_id(db, master_item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Master item not found")

    history = await crud.get_price_history(db, master_item_id, days=days)
    return [PriceHistoryPoint.model_validate(h) for h in history]


@router.post("/refresh/{master_item_id}", response_model=RefreshResponse)
async def refresh_single_item(
    master_item_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> RefreshResponse:
    """
    Manually refresh prices for a single master item.
    Applies the mandatory 3-second delay before the Steam request.
    """
    item = await crud.get_master_item_by_id(db, master_item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Master item not found")

    delay = int(await crud.get_setting(db, "steam_request_delay_seconds") or 3)
    refreshed = unavailable = errors = 0

    async with SteamMarketClient(request_delay=delay) as client:
        result = await client.get_item_price(item.market_hash_name)

    if result is None:
        errors = 1
        await crud.create_price_snapshot(
            db, master_item_id, None, None, None, None, None, "error"
        )
    else:
        if result["fetch_status"] == "unavailable":
            unavailable = 1
        else:
            refreshed = 1
        prev_snapshot = await crud.get_latest_price(db, master_item_id)
        snapshot = await crud.create_price_snapshot(
            db,
            master_item_id,
            result["lowest_price_idr"],
            result["median_price_idr"],
            result["lowest_price_usd"],
            result["median_price_usd"],
            result["volume"],
            result["fetch_status"],
        )
        await crud.upsert_market_summary(
            db,
            master_item_id=master_item_id,
            market_hash_name=item.market_hash_name,
            latest_price_idr=result["lowest_price_idr"],
            latest_price_usd=result["lowest_price_usd"],
            median_price_idr=result["median_price_idr"],
            median_price_usd=result["median_price_usd"],
            volume=result["volume"],
            market_status=result["fetch_status"],
        )
        # Update last_run_at to alert other components/tabs
        now_str = datetime.now(timezone.utc).isoformat()
        await crud.set_setting(db, "last_run_at", now_str)
        await db.commit()
        await alert_checker.check_alerts_for_item(db, master_item_id, snapshot, prev_snapshot)

    return RefreshResponse(
        message=f"Refresh complete for '{item.display_name}'.",
        items_refreshed=refreshed,
        items_unavailable=unavailable,
        items_error=errors,
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_all_inventory(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> RefreshResponse:
    """
    Manually trigger a price refresh for all items currently in any user's inventory.
    Enforces asyncio.sleep(3) between each item request.
    Logs but does not abort on per-item errors.
    """
    from datetime import datetime, timezone

    is_running = (await crud.get_setting(db, "is_running") or "false").lower() == "true"
    if is_running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A refresh is already in progress.",
        )

    await crud.set_setting(db, "is_running", "true")
    await db.commit()

    master_ids = await crud.get_all_inventory_master_ids(db)
    delay = int(await crud.get_setting(db, "steam_request_delay_seconds") or 3)
    refreshed = unavailable = errors = 0

    try:
        async with SteamMarketClient(request_delay=delay) as client:
            for mid in master_ids:
                item = await crud.get_master_item_by_id(db, mid)
                if not item:
                    continue
                try:
                    result = await client.get_item_price(item.market_hash_name)
                    if result is None:
                        errors += 1
                        await crud.create_price_snapshot(
                            db, mid, None, None, None, None, None, "error"
                        )
                    else:
                        if result["fetch_status"] == "unavailable":
                            unavailable += 1
                        else:
                            refreshed += 1
                        prev_snapshot = await crud.get_latest_price(db, mid)
                        snapshot = await crud.create_price_snapshot(
                            db,
                            mid,
                            result["lowest_price_idr"],
                            result["median_price_idr"],
                            result["lowest_price_usd"],
                            result["median_price_usd"],
                            result["volume"],
                            result["fetch_status"],
                        )
                        await crud.upsert_market_summary(
                            db,
                            master_item_id=mid,
                            market_hash_name=item.market_hash_name,
                            latest_price_idr=result["lowest_price_idr"],
                            latest_price_usd=result["lowest_price_usd"],
                            median_price_idr=result["median_price_idr"],
                            median_price_usd=result["median_price_usd"],
                            volume=result["volume"],
                            market_status=result["fetch_status"],
                        )
                        await alert_checker.check_alerts_for_item(
                            db, mid, snapshot, prev_snapshot
                        )
                    await db.commit()
                except Exception as exc:
                    logger.error("Error refreshing item_id=%d: %s", mid, exc)
                    errors += 1
    finally:
        now = datetime.now(timezone.utc).isoformat()
        await crud.set_setting(db, "is_running", "false")
        await crud.set_setting(db, "last_run_at", now)
        await crud.set_setting(db, "items_refreshed_last_run", str(refreshed))
        await crud.set_setting(db, "items_unavailable_last_run", str(unavailable))
        await db.commit()
        await alert_checker.expire_old_alerts(db)
        await db.commit()

    logger.info(
        "Manual refresh complete: refreshed=%d unavailable=%d errors=%d",
        refreshed,
        unavailable,
        errors,
    )
    return RefreshResponse(
        message="Refresh complete.",
        items_refreshed=refreshed,
        items_unavailable=unavailable,
        items_error=errors,
    )
