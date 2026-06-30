"""
Price alerts routes: create, list, update, delete, and triggered history.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import crud
from app.db.database import get_db
from app.db.models import User
from app.schemas.alerts import AlertCreate, AlertResponse, AlertUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/alerts", tags=["alerts"])


def _enrich_alert(alert) -> AlertResponse:
    return AlertResponse(
        id=alert.id,
        master_item_id=alert.master_item_id,
        alert_type=alert.alert_type,
        currency=alert.currency,
        target_value=alert.target_value,
        direction=alert.direction,
        is_active=alert.is_active,
        triggered_at=alert.triggered_at,
        created_at=alert.created_at,
        expires_at=alert.expires_at,
        item_display_name=alert.master_item.display_name if alert.master_item else None,
        item_rarity=alert.master_item.rarity if alert.master_item else None,
        item_icon_url=alert.master_item.icon_url if alert.master_item else None,
    )


@router.get("", response_model=list[AlertResponse])
async def list_active_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AlertResponse]:
    """Return all active price alerts for the current user."""
    alerts = await crud.get_active_alerts(db, current_user.id)
    return [_enrich_alert(a) for a in alerts]


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    body: AlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AlertResponse:
    """
    Create a new price alert for a master item.
    Supported types: price_below, price_above, percent_change.
    percent_change requires a direction: 'up' or 'down' (optional = any).
    """
    master = await crud.get_master_item_by_id(db, body.master_item_id)
    if not master:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Master item not found")

    alert = await crud.create_alert(
        db,
        user_id=current_user.id,
        master_item_id=body.master_item_id,
        alert_type=body.alert_type,
        currency=body.currency,
        target_value=body.target_value,
        direction=body.direction,
    )
    await db.refresh(alert, ["master_item"])
    return _enrich_alert(alert)


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int,
    body: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AlertResponse:
    """Update target_value or direction of an existing alert."""
    alert = await crud.get_alert_by_id(db, alert_id, current_user.id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")

    if body.target_value is not None:
        alert.target_value = body.target_value
    if body.direction is not None:
        alert.direction = body.direction

    await db.flush()
    await db.refresh(alert, ["master_item"])
    return _enrich_alert(alert)


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a price alert."""
    alert = await crud.get_alert_by_id(db, alert_id, current_user.id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    await crud.delete_alert(db, alert)


@router.get("/triggered", response_model=list[AlertResponse])
async def list_triggered_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AlertResponse]:
    """Return the history of alerts that have been triggered."""
    alerts = await crud.get_triggered_alerts(db, current_user.id)
    return [_enrich_alert(a) for a in alerts]
