"""Pydantic v2 schemas for master items."""

from __future__ import annotations

from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, field_validator


class ItemBase(BaseModel):
    market_hash_name: Optional[str] = None
    display_name: str
    item_type: Optional[str] = None
    rarity: Optional[str] = None
    gear_type: Optional[str] = None
    class_type: Optional[str] = None
    level: Optional[int] = None
    stats: Optional[str] = None
    icon_url: Optional[str] = None

    @field_validator("stats", mode="before")
    @classmethod
    def serialize_stats(cls, v: Any) -> Optional[str]:
        if isinstance(v, dict):
            # Format base and inherent stats if they exist in dictionary
            base_stats = v.get("base")
            inherent_stats = v.get("inherent")
            
            parts = []
            if base_stats and isinstance(base_stats, list):
                parts.extend(f"{s.get('stat')}: {s.get('disp')}" for s in base_stats if isinstance(s, dict))
            if inherent_stats and isinstance(inherent_stats, list):
                parts.extend(f"{s.get('stat')}: {s.get('disp')}" for s in inherent_stats if isinstance(s, dict))
                
            if parts:
                return ", ".join(parts)
                
            return ", ".join(f"{k}: {val}" for k, val in v.items())
        elif isinstance(v, list):
            return ", ".join(str(s) for s in v)
        return v


class ItemResponse(ItemBase):
    model_config = {"from_attributes": True}

    id: int
    created_at: datetime


class ItemBrowseResult(ItemBase):
    """Item with price information for browse/browse endpoint."""
    model_config = {"from_attributes": True}

    id: int
    lowest_price_usd: Optional[float] = None
    median_price_usd: Optional[float] = None


class ItemSearchResult(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    market_hash_name: Optional[str] = None
    display_name: str
    rarity: Optional[str] = None
    gear_type: Optional[str] = None
    icon_url: Optional[str] = None


class ItemsPage(BaseModel):
    items: list[ItemResponse]
    total: int
    page: int
    limit: int
    pages: int


class ItemsBrowsePage(BaseModel):
    """Paginated browse items with pricing."""
    items: list[ItemBrowseResult]
    total: int
    page: int
    limit: int
    pages: int


class SeedResponse(BaseModel):
    items_found: int
    items_inserted: int
    items_skipped: int
