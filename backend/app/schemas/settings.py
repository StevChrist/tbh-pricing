"""Pydantic v2 schemas for app settings."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    refresh_interval_minutes: int
    steam_currency_idr: int
    steam_currency_usd: int
    steam_app_id: int
    steam_request_delay_seconds: int
    last_run_at: Optional[str] = None
    next_run_at: Optional[str] = None
    is_running: bool
    items_refreshed_last_run: int
    items_unavailable_last_run: int


class SettingsUpdate(BaseModel):
    refresh_interval_minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    steam_request_delay_seconds: Optional[int] = Field(default=None, ge=1, le=30)
