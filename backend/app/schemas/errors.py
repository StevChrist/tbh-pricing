"""Shared error response schema."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    detail: str
    code: str
    field: Optional[str] = None
