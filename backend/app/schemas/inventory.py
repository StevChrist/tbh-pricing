"""Pydantic v2 schemas for inventory endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field, field_serializer

from app.schemas.items import ItemSearchResult
from app.schemas.prices import PriceSnapshot


class InventoryCreate(BaseModel):
    master_item_id: int
    quantity: int = Field(default=1, ge=1)
    notes: Optional[str] = Field(default=None, max_length=2000)


class InventoryBulkCreateItem(BaseModel):
    master_item_id: int
    quantity: int = Field(default=1, ge=1)


class InventoryBulkCreate(BaseModel):
    items: list[InventoryBulkCreateItem] = Field(..., min_length=1)


class InventoryUpdate(BaseModel):
    quantity: Optional[int] = Field(default=None, ge=1)
    notes: Optional[str] = Field(default=None, max_length=2000)


class InventoryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    master_item_id: int
    quantity: int
    notes: Optional[str]
    added_at: datetime
    updated_at: datetime

    @field_serializer("added_at", "updated_at")
    def serialize_datetimes(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()

    master_item: ItemSearchResult
    latest_price: Optional[PriceSnapshot] = None


class BulkDeleteRequest(BaseModel):
    ids: list[int] = Field(..., min_length=1)


class BulkDeleteResponse(BaseModel):
    deleted: int


class BulkAddResult(BaseModel):
    added: list[InventoryResponse]
    skipped_duplicates: list[int]  # master_item_ids that were duplicates
    errors: list[str]


class HighestValueItem(BaseModel):
    inventory_id: int
    master_item_id: int
    display_name: str
    total_value_idr: float


class InventorySummary(BaseModel):
    total_unique_items: int
    total_quantity: int
    total_value_idr: float
    total_value_usd: float
    highest_value_item: Optional[HighestValueItem] = None
    last_refreshed_at: Optional[str] = None
