from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import crud
from app.db.database import get_db
from app.db.models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


# Schemas
class AdminNotifyRequest(BaseModel):
    notify_type: Literal["alert", "message", "notification"]
    message: str = Field(..., min_length=1, max_length=512)


class AdminUserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    username: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None = None
    last_active_at: datetime | None = None
    last_ip_address: str | None = None
    daily_active_seconds: int
    inventory_count: int


class LogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int | None = None
    username: str | None = None
    action: str
    details: str | None = None
    ip_address: str | None = None
    created_at: datetime


class LogsResponse(BaseModel):
    logs: list[LogResponse]
    total: int
    limit: int
    offset: int


# Helper to check admin role
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access required",
        )
    return current_user


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[dict]:
    """Retrieve all users with metadata and item counts (Admin only)."""
    users_data = await crud.get_all_users_admin(db)
    return users_data


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    """Delete a user account (Admin only)."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot delete their own account",
        )
    
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    username = user.username
    await crud.delete_user(db, user_id)

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="delete_user",
        details=f"Admin deleted user account: {username} (ID: {user_id})",
        ip_address=admin.last_ip_address
    )
    await db.commit()
    logger.info("Admin %s deleted user %s (id=%d)", admin.username, username, user_id)


@router.post("/users/{user_id}/notify", status_code=status.HTTP_201_CREATED)
async def notify_user(
    user_id: int,
    body: AdminNotifyRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Send a custom message/alert/notification to a user (Admin only)."""
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await crud.create_admin_notification(
        db,
        user_id=user_id,
        message=body.message,
        notify_type=body.notify_type,
    )

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="send_notification",
        details=f"Admin sent {body.notify_type} notice to user {user.username}: '{body.message}'",
        ip_address=admin.last_ip_address
    )
    await db.commit()
    return {"status": "success", "message": "Notification queued successfully"}


@router.get("/logs", response_model=LogsResponse)
async def list_logs(
    username: str | None = Query(default=None),
    action: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> LogsResponse:
    """Retrieve website activity logs with filters and pagination (Admin only)."""
    logs = await crud.get_activity_logs(db, username=username, action=action, limit=limit, offset=offset)
    total = await crud.count_activity_logs(db, username=username, action=action)
    
    return LogsResponse(
        logs=logs,
        total=total,
        limit=limit,
        offset=offset,
    )
