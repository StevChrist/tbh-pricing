"""Pydantic v2 schemas for price endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, field_serializer


class PriceSnapshot(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    master_item_id: int
    lowest_price_idr: Optional[float] = None
    median_price_idr: Optional[float] = None
    lowest_price_usd: Optional[float] = None
    median_price_usd: Optional[float] = None
    volume: Optional[int] = None
    fetch_status: str
    fetched_at: datetime

    @field_serializer("fetched_at")
    def serialize_fetched_at(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()


class PriceHistoryPoint(BaseModel):
    model_config = {"from_attributes": True}

    fetched_at: datetime
    lowest_price_idr: Optional[float] = None

    @field_serializer("fetched_at")
    def serialize_fetched_at(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    median_price_idr: Optional[float] = None
    lowest_price_usd: Optional[float] = None
    median_price_usd: Optional[float] = None
    volume: Optional[int] = None
    fetch_status: str


class PriceStatus(BaseModel):
    last_run_at: Optional[str] = None
    next_run_at: Optional[str] = None
    is_running: bool = False
    items_refreshed_last_run: int = 0
    items_unavailable_last_run: int = 0


class RefreshResponse(BaseModel):
    message: str
    items_refreshed: int
    items_unavailable: int
    items_error: int
