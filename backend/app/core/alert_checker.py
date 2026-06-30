"""
Price alert checker — runs after each scheduler refresh cycle.

For every active, non-expired alert, compares the latest price snapshot
against the alert condition. On match: creates a Notification row and
deactivates the alert.
"""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.db import crud
from app.db.models import AlertTypeEnum, PriceAlert, PriceHistory

logger = logging.getLogger(__name__)


def _get_price_for_currency(
    snapshot: PriceHistory, currency: str
) -> float | None:
    """Return the lowest price from a snapshot for the given currency code."""
    if currency == "IDR":
        return snapshot.lowest_price_idr
    if currency == "USD":
        return snapshot.lowest_price_usd
    return None


def _get_previous_price_for_currency(
    prev_snapshot: PriceHistory | None, currency: str
) -> float | None:
    if prev_snapshot is None:
        return None
    return _get_price_for_currency(prev_snapshot, currency)


def _alert_condition_met(
    alert: PriceAlert,
    current_price: float,
    previous_price: float | None,
) -> bool:
    """
    Evaluate whether the alert condition is satisfied.

    alert_type options:
      - price_below:    current_price <= target_value
      - price_above:    current_price >= target_value
      - percent_change: abs % change from prev >= target_value,
                        filtered by direction ('up'|'down') if set
    """
    if alert.alert_type == AlertTypeEnum.PRICE_BELOW:
        return current_price <= alert.target_value

    if alert.alert_type == AlertTypeEnum.PRICE_ABOVE:
        return current_price >= alert.target_value

    if alert.alert_type == AlertTypeEnum.PERCENT_CHANGE:
        if previous_price is None or previous_price == 0:
            return False
        pct_change = (current_price - previous_price) / previous_price * 100
        abs_change = abs(pct_change)
        if abs_change < alert.target_value:
            return False
        if alert.direction == "up":
            return pct_change > 0
        if alert.direction == "down":
            return pct_change < 0
        return True  # any direction

    return False


def _build_message(
    alert: PriceAlert,
    current_idr: float | None,
    current_usd: float | None,
) -> str:
    """Build a human-readable notification message."""
    item_name = alert.master_item.display_name

    type_map = {
        AlertTypeEnum.PRICE_BELOW: f"harga ≤ {alert.target_value:,.0f} {alert.currency}",
        AlertTypeEnum.PRICE_ABOVE: f"harga ≥ {alert.target_value:,.0f} {alert.currency}",
        AlertTypeEnum.PERCENT_CHANGE: (
            f"perubahan harga ≥ {alert.target_value}%"
            + (f" ({alert.direction})" if alert.direction else "")
        ),
    }
    condition_str = type_map.get(alert.alert_type, str(alert.alert_type))

    price_parts = []
    if current_idr is not None:
        price_parts.append(f"Rp {current_idr:,.0f} (IDR)")
    if current_usd is not None:
        price_parts.append(f"${current_usd:.2f} (USD)")
    price_str = " | ".join(price_parts) if price_parts else "N/A"

    return (
        f"Alert terpenuhi untuk {item_name}: {condition_str}. "
        f"Harga sekarang: {price_str}."
    )


async def check_alerts_for_item(
    db: AsyncSession,
    master_item_id: int,
    snapshot: PriceHistory,
    prev_snapshot: PriceHistory | None,
) -> int:
    """
    Check all active alerts for a given master_item_id.
    Creates notifications for any triggered alerts.
    Returns the count of alerts triggered.
    """
    alerts = await crud.get_all_active_alerts(db)
    item_alerts = [a for a in alerts if a.master_item_id == master_item_id]

    triggered = 0
    for alert in item_alerts:
        current_price = _get_price_for_currency(snapshot, alert.currency)
        if current_price is None:
            continue  # no price available — skip

        prev_price = _get_previous_price_for_currency(prev_snapshot, alert.currency)
        if not _alert_condition_met(alert, current_price, prev_price):
            continue

        # Trigger: create notification + deactivate alert
        message = _build_message(alert, snapshot.lowest_price_idr, snapshot.lowest_price_usd)
        await crud.create_notification(
            db=db,
            user_id=alert.user_id,
            alert_id=alert.id,
            master_item_id=master_item_id,
            message=message,
            triggered_price_idr=snapshot.lowest_price_idr,
            triggered_price_usd=snapshot.lowest_price_usd,
            target_value=alert.target_value,
        )
        await crud.deactivate_alert(db, alert)
        
        username = alert.user.username if alert.user else f"user_{alert.user_id}"
        await crud.log_activity(
            db,
            user_id=alert.user_id,
            username=username,
            action="alert_triggered",
            details=f"Alert triggered for {alert.master_item.display_name}. {message}",
            ip_address="127.0.0.1"
        )
        
        triggered += 1
        logger.info(
            "Alert #%d triggered for user_id=%d, item_id=%d.",
            alert.id,
            alert.user_id,
            master_item_id,
        )

    return triggered


async def expire_old_alerts(db: AsyncSession) -> None:
    """Deactivate alerts that have passed their 30-day expiry."""
    count = await crud.expire_old_alerts(db)
    if count:
        logger.info("Expired %d stale price alerts.", count)
