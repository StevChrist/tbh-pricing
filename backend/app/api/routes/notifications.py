"""
Notifications routes: list, mark as read, and delete.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import crud
from app.db.database import get_db
from app.db.models import User
from app.schemas.alerts import NotificationResponse, NotificationsResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])


def _enrich_notif(n) -> NotificationResponse:
    return NotificationResponse(
        id=n.id,
        alert_id=n.alert_id,
        master_item_id=n.master_item_id,
        notification_type=n.notification_type,
        message=n.message,
        triggered_price_idr=n.triggered_price_idr,
        triggered_price_usd=n.triggered_price_usd,
        target_value=n.target_value,
        is_read=n.is_read,
        created_at=n.created_at,
        item_display_name=n.master_item.display_name if n.master_item else None,
        item_rarity=n.master_item.rarity if n.master_item else None,
        item_icon_url=n.master_item.icon_url if n.master_item else None,
        alert_type=n.alert.alert_type if n.alert else None,
        currency=n.alert.currency if n.alert else None,
    )


@router.get("", response_model=NotificationsResponse)
async def list_notifications(
    unread_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationsResponse:
    """
    List all notifications for the current user.
    Optionally filter to unread only.
    Also returns the total unread count for badge display.
    """
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.db.models import Notification

    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .options(
            selectinload(Notification.master_item),
            selectinload(Notification.alert),
        )
        .order_by(Notification.created_at.desc())
    )
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)

    result = await db.execute(stmt)
    notifs = list(result.scalars().all())
    unread_count = await crud.get_unread_count(db, current_user.id)

    return NotificationsResponse(
        notifications=[_enrich_notif(n) for n in notifs],
        unread_count=unread_count,
    )


@router.get("/unread", response_model=NotificationsResponse)
async def get_unread_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationsResponse:
    """
    Return all unread notifications — used by the pop-up carousel on the frontend.
    """
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.db.models import Notification

    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read == False)
        .options(
            selectinload(Notification.master_item),
            selectinload(Notification.alert),
        )
        .order_by(Notification.created_at.asc())
    )
    result = await db.execute(stmt)
    notifs = list(result.scalars().all())
    unread_count = len(notifs)

    return NotificationsResponse(
        notifications=[_enrich_notif(n) for n in notifs],
        unread_count=unread_count,
    )


@router.put("/{notif_id}/read", response_model=NotificationResponse)
async def mark_read(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationResponse:
    """Mark a single notification as read."""
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.db.models import Notification

    stmt = (
        select(Notification)
        .where(Notification.id == notif_id, Notification.user_id == current_user.id)
        .options(
            selectinload(Notification.master_item),
            selectinload(Notification.alert),
        )
    )
    result = await db.execute(stmt)
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notif.is_read = True
    await db.flush()
    return _enrich_notif(notif)


@router.put("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Mark all notifications as read for the current user."""
    await crud.mark_all_notifications_read(db, current_user.id)


@router.delete("/{notif_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notif_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a notification from the message inbox."""
    deleted = await crud.delete_notification(db, notif_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_all_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete ALL notifications for the current user."""
    await crud.delete_all_notifications(db, current_user.id)

