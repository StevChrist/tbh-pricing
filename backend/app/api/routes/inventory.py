"""
Inventory routes: CRUD, bulk operations, and summary.
Enforces one row per master item per user (HTTP 409 on duplicate).
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.steam import SteamMarketClient
from app.db import crud
from app.db.database import get_db
from app.db.models import User
from app.schemas.inventory import (
    BulkAddResult,
    BulkDeleteRequest,
    BulkDeleteResponse,
    InventoryBulkCreate,
    InventoryCreate,
    InventoryResponse,
    InventorySummary,
    InventoryUpdate,
)
from app.schemas.prices import PriceSnapshot

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/inventory", tags=["inventory"])


def _build_inventory_response(inv, price) -> InventoryResponse:
    """Build an InventoryResponse from ORM objects."""
    latest_price = None
    if price:
        latest_price = PriceSnapshot(
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
    return InventoryResponse(
        id=inv.id,
        master_item_id=inv.master_item_id,
        quantity=inv.quantity,
        notes=inv.notes,
        added_at=inv.added_at,
        updated_at=inv.updated_at,
        master_item=inv.master_item,
        latest_price=latest_price,
    )


@router.get("/summary", response_model=InventorySummary)
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InventorySummary:
    """
    Return aggregate stats for the current user's inventory:
    total unique items, total quantity, total value IDR/USD,
    highest value item, and last refresh timestamp.
    """
    data = await crud.get_inventory_summary(db, current_user.id)
    return InventorySummary(**data)


@router.get("", response_model=list[InventoryResponse])
async def list_inventory(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[InventoryResponse]:
    """
    List all inventory items for the current user,
    each joined with the latest price snapshot (IDR + USD).
    """
    rows = await crud.get_inventory_with_latest_prices(db, current_user.id)
    return [_build_inventory_response(r["inventory"], r["price"]) for r in rows]


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
async def add_inventory_item(
    body: InventoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InventoryResponse:
    """
    Add a single item to the user's inventory.
    - 404 if master_item_id does not exist in master_items.
    - 409 DUPLICATE_INVENTORY_ITEM if the item is already in inventory.
    """
    master = await crud.get_master_item_by_id(db, body.master_item_id)
    if not master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Master item not found",
        )

    existing = await crud.get_inventory_item_by_master(
        db, current_user.id, body.master_item_id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item already in inventory",
        )

    try:
        inv = await crud.create_inventory_item(
            db,
            user_id=current_user.id,
            master_item_id=body.master_item_id,
            quantity=body.quantity,
            notes=body.notes,
        )
        await db.refresh(inv, ["master_item"])
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item already in inventory",
        )

    # Inline refresh price from Steam so it says "just now" immediately
    price = None
    if inv.master_item.market_hash_name:
        try:
            delay = int(await crud.get_setting(db, "steam_request_delay_seconds") or 3)
            async with SteamMarketClient(request_delay=delay) as client:
                result = await client.get_item_price(inv.master_item.market_hash_name)
            if result and result["fetch_status"] == "ok":
                price = await crud.create_price_snapshot(
                    db,
                    inv.master_item_id,
                    result["lowest_price_idr"],
                    result["median_price_idr"],
                    result["lowest_price_usd"],
                    result["median_price_usd"],
                    result["volume"],
                    result["fetch_status"],
                )
                await crud.upsert_market_summary(
                    db,
                    master_item_id=inv.master_item_id,
                    market_hash_name=inv.master_item.market_hash_name,
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
        except Exception as exc:
            logger.warning("Failed to refresh price inline during item add: %s", exc)

    if not price:
        price = await crud.get_latest_price(db, inv.master_item_id)

    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="add_item",
        details=f"Added item {inv.master_item.display_name} (Qty: {inv.quantity})",
        ip_address=current_user.last_ip_address
    )
    await db.commit()

    return _build_inventory_response(inv, price)


@router.post("/bulk", response_model=BulkAddResult, status_code=status.HTTP_201_CREATED)
async def bulk_add_inventory(
    body: InventoryBulkCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BulkAddResult:
    """
    Add multiple items to inventory in one request.
    Duplicates are reported in skipped_duplicates (not added).
    Unknown master_item_ids are reported in errors.
    """
    added: list[InventoryResponse] = []
    skipped_duplicates: list[int] = []
    errors: list[str] = []

    for entry in body.items:
        master = await crud.get_master_item_by_id(db, entry.master_item_id)
        if not master:
            errors.append(f"master_item_id {entry.master_item_id} not found")
            continue

        existing = await crud.get_inventory_item_by_master(
            db, current_user.id, entry.master_item_id
        )
        if existing:
            skipped_duplicates.append(entry.master_item_id)
            continue

        try:
            inv = await crud.create_inventory_item(
                db,
                user_id=current_user.id,
                master_item_id=entry.master_item_id,
                quantity=entry.quantity,
                notes=None,
            )
            await db.refresh(inv, ["master_item"])
            price = await crud.get_latest_price(db, inv.master_item_id)
            added.append(_build_inventory_response(inv, price))
        except IntegrityError:
            await db.rollback()
            skipped_duplicates.append(entry.master_item_id)

    if added:
        item_names = ", ".join([x.master_item.display_name for x in added[:3]])
        if len(added) > 3:
            item_names += f" and {len(added) - 3} more"
        await crud.log_activity(
            db,
            user_id=current_user.id,
            username=current_user.username,
            action="bulk_add_item",
            details=f"Bulk added {len(added)} items: {item_names}",
            ip_address=current_user.last_ip_address
        )
        await db.commit()

    return BulkAddResult(
        added=added,
        skipped_duplicates=skipped_duplicates,
        errors=errors,
    )


@router.put("/{item_id}", response_model=InventoryResponse)
async def update_inventory_item(
    item_id: int,
    body: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> InventoryResponse:
    """
    Update quantity and/or notes for an inventory item.
    Only the owning user can update their own items.
    """
    inv = await crud.get_inventory_item(db, item_id)
    if not inv or inv.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")

    inv = await crud.update_inventory_item(db, inv, body.quantity, body.notes)
    await db.refresh(inv, ["master_item"])
    price = await crud.get_latest_price(db, inv.master_item_id)

    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="edit_item",
        details=f"Updated item {inv.master_item.display_name} (New Qty: {inv.quantity})",
        ip_address=current_user.last_ip_address
    )
    await db.commit()

    return _build_inventory_response(inv, price)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Remove a single item from the user's inventory."""
    inv = await crud.get_inventory_item(db, item_id)
    if not inv or inv.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    
    await db.refresh(inv, ["master_item"])
    item_name = inv.master_item.display_name

    await crud.delete_inventory_item(db, inv)

    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete_item",
        details=f"Deleted item {item_name}",
        ip_address=current_user.last_ip_address
    )
    await db.commit()


@router.delete("", response_model=BulkDeleteResponse)
async def bulk_delete_inventory(
    body: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BulkDeleteResponse:
    """
    Delete multiple inventory items by ID.
    Only items belonging to the current user are affected.
    """
    deleted = await crud.bulk_delete_inventory_items(db, current_user.id, body.ids)
    if deleted > 0:
        await crud.log_activity(
            db,
            user_id=current_user.id,
            username=current_user.username,
            action="bulk_delete_item",
            details=f"Bulk deleted {deleted} items",
            ip_address=current_user.last_ip_address
        )
        await db.commit()
    return BulkDeleteResponse(deleted=deleted)
