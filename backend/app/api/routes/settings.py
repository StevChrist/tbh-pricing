"""Settings and export routes."""

from __future__ import annotations

import csv
import io
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import crud
from app.db.database import get_db
from app.db.models import User
from app.schemas.settings import SettingsResponse, SettingsUpdate

logger = logging.getLogger(__name__)
router = APIRouter(tags=["settings"])


@router.get("/settings", response_model=SettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SettingsResponse:
    """Return all application settings."""
    s = await crud.get_all_settings(db)
    return SettingsResponse(
        refresh_interval_minutes=int(s.get("refresh_interval_minutes", 15)),
        steam_currency_idr=int(s.get("steam_currency_idr", 10)),
        steam_currency_usd=int(s.get("steam_currency_usd", 1)),
        steam_app_id=int(s.get("steam_app_id", 3678970)),
        steam_request_delay_seconds=int(s.get("steam_request_delay_seconds", 3)),
        last_run_at=s.get("last_run_at") or None,
        next_run_at=s.get("next_run_at") or None,
        is_running=s.get("is_running", "false").lower() == "true",
        items_refreshed_last_run=int(s.get("items_refreshed_last_run", 0)),
        items_unavailable_last_run=int(s.get("items_unavailable_last_run", 0)),
    )


@router.put("/settings", response_model=SettingsResponse)
async def update_settings(
    body: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsResponse:
    """
    Update one or more application settings.
    Currently supports: refresh_interval_minutes, steam_request_delay_seconds.
    """
    updates: dict[str, str] = {}
    if body.refresh_interval_minutes is not None:
        updates["refresh_interval_minutes"] = str(body.refresh_interval_minutes)
    if body.steam_request_delay_seconds is not None:
        updates["steam_request_delay_seconds"] = str(body.steam_request_delay_seconds)

    if updates:
        await crud.update_settings(db, updates)
        
        details_str = ", ".join([f"{k}={v}" for k, v in updates.items()])
        await crud.log_activity(
            db,
            user_id=current_user.id,
            username=current_user.username,
            action="update_settings",
            details=f"Updated system settings: {details_str}",
            ip_address=current_user.last_ip_address
        )
        await db.commit()

    return await get_settings(db, current_user)


@router.get("/export/csv")
async def export_inventory_csv(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    """
    Export the current user's full inventory with latest prices as a CSV file.
    Columns: item name, rarity, type, quantity, lowest IDR, median IDR,
             lowest USD, median USD, volume, fetch status, last fetched, notes.
    """
    rows = await crud.get_inventory_with_latest_prices(db, current_user.id)

    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="export_csv",
        details="Exported inventory as CSV file",
        ip_address=current_user.last_ip_address
    )
    await db.commit()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Item Name", "Market Hash Name", "Rarity", "Type",
        "Quantity", "Lowest Price IDR", "Median Price IDR",
        "Lowest Price USD", "Median Price USD",
        "Volume", "Fetch Status", "Last Fetched", "Notes",
    ])

    for row in rows:
        inv = row["inventory"]
        price = row["price"]
        master = inv.master_item
        writer.writerow([
            master.display_name,
            master.market_hash_name,
            master.rarity or "",
            master.item_type or "",
            inv.quantity,
            price.lowest_price_idr if price else "",
            price.median_price_idr if price else "",
            price.lowest_price_usd if price else "",
            price.median_price_usd if price else "",
            price.volume if price else "",
            price.fetch_status if price else "",
            price.fetched_at.isoformat() if price else "",
            inv.notes or "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tbh_inventory.csv"},
    )
