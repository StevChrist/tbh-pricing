"""
Master items routes: browse, search, and admin seed from Steam Market.
"""

from __future__ import annotations

import json
import logging
import math
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.steam import SteamMarketClient
from app.db import crud
from app.db.database import get_db
from app.db.models import User
from app.schemas.items import ItemResponse, ItemSearchResult, ItemsPage, ItemsBrowsePage, ItemBrowseResult, SeedResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/items", tags=["items"])

_BACKUP_PATH = Path(__file__).resolve().parents[4] / "data" / "tbh_items_master.json"


@router.get("/search", response_model=list[ItemSearchResult])
async def search_items(
    q: str = Query(..., min_length=2, description="Search term, minimum 2 characters"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ItemSearchResult]:
    """
    Autocomplete search for master items by display name.
    Returns max 20 results. Minimum query length: 2 characters.
    """
    items = await crud.search_master_items(db, q, limit=20)
    return [ItemSearchResult.model_validate(i) for i in items]


@router.get("", response_model=ItemsPage)
async def list_items(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    rarity: str | None = Query(default=None),
    item_type: str | None = Query(default=None),
    gear_type: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ItemsPage:
    """
    Paginated list of all master items with optional filters.
    Supports filtering by rarity, item_type, and gear_type.
    """
    items, total = await crud.get_master_items(
        db, page=page, limit=limit, search=search, rarity=rarity, item_type=item_type, gear_type=gear_type
    )
    return ItemsPage(
        items=[ItemResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total else 0,
    )


@router.get("/browse/list", response_model=ItemsBrowsePage)
async def browse_items(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    rarity: str | None = Query(default=None),
    item_type: str | None = Query(default=None),
    gear_type: str | None = Query(default=None),
    class_type: str | None = Query(default=None),
    level: int | None = Query(default=None),
    sort_by: str = Query(default="rarity"),
    sort_order: str = Query(default="asc"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ItemsBrowsePage:
    """
    Paginated browse view of all master items with pricing information.
    Includes latest USD prices from price history.
    Supports filtering by rarity, item_type, gear_type, class_type, and level.
    """
    items, total = await crud.get_master_items(
        db,
        page=page,
        limit=limit,
        search=search,
        rarity=rarity,
        item_type=item_type,
        gear_type=gear_type,
        class_type=class_type,
        level=level,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    
    # Fetch latest prices for each item
    browse_items = []
    for item in items:
        price_data = await crud.get_latest_price(db, item.id)
        browse_result = ItemBrowseResult.model_validate(item)
        if price_data:
            browse_result.lowest_price_usd = price_data.lowest_price_usd
            browse_result.median_price_usd = price_data.median_price_usd
        browse_items.append(browse_result)
    
    return ItemsBrowsePage(
        items=browse_items,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total else 0,
    )


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ItemResponse:
    """Retrieve a single master item by its ID."""
    item = await crud.get_master_item_by_id(db, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    return ItemResponse.model_validate(item)


@router.post("/seed", response_model=SeedResponse)
async def seed_items(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SeedResponse:
    """
    Admin endpoint: trigger full ETL synchronization and metadata seed.
    """
    logger.info("Admin triggered full synchronization / seed.")
    from app.core.sync_service import run_synchronization
    
    result = await run_synchronization(db, mode="full")
    if result["status"] == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Full synchronization run encountered a fatal error.",
        )
        
    total_found = result["items_imported"] + result["items_skipped"] + result["items_updated"]
    return SeedResponse(
        items_found=total_found,
        items_inserted=result["items_imported"],
        items_skipped=result["items_skipped"] + result["items_updated"],
    )
