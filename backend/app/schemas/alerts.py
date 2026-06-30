"""Pydantic v2 schemas for price alerts and notifications."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_serializer


class AlertCreate(BaseModel):
    master_item_id: int
    alert_type: Literal["price_below", "price_above", "percent_change"]
    currency: Literal["IDR", "USD"]
    target_value: float = Field(..., gt=0)
    direction: Optional[Literal["up", "down"]] = None


class AlertUpdate(BaseModel):
    target_value: Optional[float] = Field(default=None, gt=0)
    direction: Optional[Literal["up", "down"]] = None


class AlertResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    master_item_id: int
    alert_type: str
    currency: str
    target_value: float
    direction: Optional[str] = None
    is_active: bool
    triggered_at: Optional[datetime] = None
    created_at: datetime
    expires_at: datetime

    @field_serializer("triggered_at", "created_at", "expires_at")
    def serialize_datetimes(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    item_display_name: Optional[str] = None
    item_rarity: Optional[str] = None
    item_icon_url: Optional[str] = None


class NotificationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    alert_id: int
    master_item_id: int
    message: str
    triggered_price_idr: Optional[float] = None
    triggered_price_usd: Optional[float] = None
    target_value: float
    is_read: bool
    created_at: datetime

    @field_serializer("created_at")
    def serialize_created_at(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    item_display_name: Optional[str] = None
    item_rarity: Optional[str] = None
    item_icon_url: Optional[str] = None
    alert_type: Optional[str] = None
    currency: Optional[str] = None


class NotificationsResponse(BaseModel):
    notifications: list[NotificationResponse]
    unread_count: int
