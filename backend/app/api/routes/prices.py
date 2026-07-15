"""
Prices routes: latest snapshot, history chart, manual refresh.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import crud
from app.db.database import get_db
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
    Return the cached price for a single master item from the MarketSummary table.
    Prices are updated automatically by the background batch sync job every 15 minutes.
    This endpoint no longer calls Steam directly to avoid rate limiting.
    """
    item = await crud.get_master_item_by_id(db, master_item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Master item not found")

    if not item.market_hash_name:
        return RefreshResponse(
            message=f"'{item.display_name}' is not tradable on Steam Market.",
            items_refreshed=0,
            items_unavailable=1,
            items_error=0,
        )

    # Read latest cached price from DB — no live Steam API call
    price = await crud.get_latest_price(db, master_item_id)
    if price and price.fetch_status == "ok":
        return RefreshResponse(
            message=f"Cached price for '{item.display_name}' (auto-updated every 15 min).",
            items_refreshed=1,
            items_unavailable=0,
            items_error=0,
        )
    elif price and price.fetch_status == "unavailable":
        return RefreshResponse(
            message=f"'{item.display_name}' is currently not listed on Steam Market.",
            items_refreshed=0,
            items_unavailable=1,
            items_error=0,
        )
    else:
        return RefreshResponse(
            message=f"No price data yet for '{item.display_name}'. It will be synced in the next batch.",
            items_refreshed=0,
            items_unavailable=0,
            items_error=0,
        )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_all_inventory(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RefreshResponse:
    """
    Manually trigger a price refresh for all items currently in any user's inventory.
    Enforces asyncio.sleep(3) between each item request.
    Logs but does not abort on per-item errors.
    """
    is_running = (await crud.get_setting(db, "is_running") or "false").lower() == "true"
    if is_running:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A refresh or synchronization is already in progress.",
        )

    await crud.set_setting(db, "is_running", "true")
    await db.commit()

    try:
        from app.core.scheduler import sync_all_steam_prices
        res = await sync_all_steam_prices(db)
        refreshed = res.get("refreshed", 0)
        total = res.get("total", 0)
        errors = res.get("errors", 0)

        # Log manual refresh activity
        client_ip = request.client.host if request.client else current_user.last_ip_address
        await crud.log_activity(
            db,
            user_id=current_user.id,
            username=current_user.username,
            action="price_sync",
            details=f"Manual price refresh complete — synced total={total} (refreshed={refreshed} errors={errors})",
            ip_address=client_ip
        )
        await db.commit()
    finally:
        await crud.set_setting(db, "is_running", "false")
        await db.commit()

    return RefreshResponse(
        message="Refresh complete.",
        items_refreshed=refreshed,
        items_unavailable=0,
        items_error=errors,
    )
