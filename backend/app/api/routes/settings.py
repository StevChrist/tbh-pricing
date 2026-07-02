"""Settings and export routes."""

from __future__ import annotations

import csv
import io
import logging

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.price_helper import calculate_steam_receive_price
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
        refresh_interval_minutes=int(s.get("refresh_interval_minutes", "30")),
        steam_request_delay_seconds=float(s.get("steam_request_delay_seconds", "5.0")),
    )


@router.post("/settings", response_model=SettingsResponse)
async def update_settings(
    payload: SettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsResponse:
    """Update application settings."""
    if payload.refresh_interval_minutes is not None:
        await crud.set_setting(db, "refresh_interval_minutes", str(payload.refresh_interval_minutes))
    if payload.steam_request_delay_seconds is not None:
        await crud.set_setting(db, "steam_request_delay_seconds", str(payload.steam_request_delay_seconds))
    
    # Log config change
    if payload.refresh_interval_minutes is not None or payload.steam_request_delay_seconds is not None:
        details = []
        if payload.refresh_interval_minutes is not None:
            details.append(f"refresh_interval={payload.refresh_interval_minutes}m")
        if payload.steam_request_delay_seconds is not None:
            details.append(f"delay={payload.steam_request_delay_seconds}s")
            
        await crud.log_activity(
            db,
            user_id=current_user.id,
            username=current_user.username,
            action="update_settings",
            details=f"Updated settings: {', '.join(details)}",
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
    Columns: item name, rarity, type, quantity, lowest IDR, receive IDR, median IDR,
             lowest USD, receive USD, median USD, volume, fetch status, last fetched, notes.
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
        "Quantity", "Lowest Price IDR", "Receive Price IDR", "Median Price IDR",
        "Lowest Price USD", "Receive Price USD", "Median Price USD",
        "Volume", "Fetch Status", "Last Fetched", "Notes",
    ])

    for row in rows:
        inv = row["inventory"]
        price = row["price"]
        master = inv.master_item
        
        lowest_idr = price.lowest_price_idr if price else None
        lowest_usd = price.lowest_price_usd if price else None
        
        receive_idr = calculate_steam_receive_price(lowest_idr, "IDR") if lowest_idr is not None else ""
        receive_usd = calculate_steam_receive_price(lowest_usd, "USD") if lowest_usd is not None else ""
        
        writer.writerow([
            master.display_name,
            master.market_hash_name,
            master.rarity or "",
            master.item_type or "",
            inv.quantity,
            lowest_idr if lowest_idr is not None else "",
            receive_idr,
            price.median_price_idr if price else "",
            lowest_usd if lowest_usd is not None else "",
            receive_usd,
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
