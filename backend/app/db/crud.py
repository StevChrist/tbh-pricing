"""
CRUD operations for all database models.
Each function accepts an AsyncSession and returns ORM objects or None.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models import (
    AppSetting,
    FetchStatusEnum,
    InventoryItem,
    MasterItem,
    MarketSummary,
    Notification,
    PriceAlert,
    PriceHistory,
    SyncLog,
    User,
)

logger = logging.getLogger(__name__)


# ===========================================================================
# Helpers
# ===========================================================================


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ===========================================================================
# Users
# ===========================================================================


async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
    result = await db.get(User, user_id)
    return result


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession, username: str, email: str, password_hash: str
) -> User:
    user = User(username=username, email=email, password_hash=password_hash)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def update_user_last_login(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(User).where(User.id == user_id).values(last_login_at=_now())
    )


async def update_user_password(db: AsyncSession, user_id: int, new_password_hash: str) -> None:
    await db.execute(
        update(User).where(User.id == user_id).values(password_hash=new_password_hash)
    )


async def delete_user(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        delete(User).where(User.id == user_id)
    )


# ===========================================================================
# Master Items
# ===========================================================================


async def get_master_item_by_id(db: AsyncSession, item_id: int) -> MasterItem | None:
    return await db.get(MasterItem, item_id)


async def get_master_item_by_hash(
    db: AsyncSession, market_hash_name: str
) -> MasterItem | None:
    result = await db.execute(
        select(MasterItem).where(MasterItem.market_hash_name == market_hash_name)
    )
    return result.scalar_one_or_none()


from sqlalchemy import case
from app.db.models import RarityEnum


async def get_master_items(
    db: AsyncSession,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    rarity: str | None = None,
    item_type: str | None = None,
    gear_type: str | None = None,
    class_type: str | None = None,
    level: int | None = None,
    sort_by: str = "rarity",
    sort_order: str = "asc",
) -> tuple[list[MasterItem], int]:
    """
    Return (items, total_count) with optional filters, sorted dynamically.
    Deduplicates by (display_name, rarity): for each group, prefers the
    tradable item (market_hash_name IS NOT NULL), then picks the lowest id.
    """
    from sqlalchemy import text

    # Build a subquery that picks one representative id per (display_name, rarity):
    #   - prefer items with market_hash_name (tradable = Variant A)
    #   - fall back to min(id) within the group
    dedup_subq = (
        select(
            func.min(MasterItem.id).label("id")
        )
        .group_by(MasterItem.display_name, MasterItem.rarity)
    ).subquery()

    stmt = select(MasterItem).where(MasterItem.id.in_(select(dedup_subq.c.id)))
    count_stmt = select(func.count()).where(
        MasterItem.id.in_(select(dedup_subq.c.id))
    )

    if sort_by == "price":
        stmt = stmt.outerjoin(MarketSummary, MasterItem.id == MarketSummary.master_item_id)
        count_stmt = count_stmt.select_from(MasterItem).outerjoin(
            MarketSummary, MasterItem.id == MarketSummary.master_item_id
        ).where(MasterItem.id.in_(select(dedup_subq.c.id)))

    if search:
        like = f"%{search}%"
        stmt = stmt.where(MasterItem.display_name.ilike(like))
        count_stmt = count_stmt.where(MasterItem.display_name.ilike(like))
    if rarity:
        stmt = stmt.where(MasterItem.rarity == rarity.upper())
        count_stmt = count_stmt.where(MasterItem.rarity == rarity.upper())
    if item_type:
        stmt = stmt.where(MasterItem.item_type == item_type.upper())
        count_stmt = count_stmt.where(MasterItem.item_type == item_type.upper())
    if gear_type:
        stmt = stmt.where(MasterItem.gear_type == gear_type.upper())
        count_stmt = count_stmt.where(MasterItem.gear_type == gear_type.upper())
    if class_type:
        stmt = stmt.where(MasterItem.class_type == class_type)
        count_stmt = count_stmt.where(MasterItem.class_type == class_type)
    if level is not None:
        stmt = stmt.where(MasterItem.level == level)
        count_stmt = count_stmt.where(MasterItem.level == level)

    is_desc = sort_order.lower() == "desc"
    if sort_by == "rarity":
        rarity_order = case(
            (MasterItem.rarity == RarityEnum.COMMON, 1),
            (MasterItem.rarity == RarityEnum.UNCOMMON, 2),
            (MasterItem.rarity == RarityEnum.RARE, 3),
            (MasterItem.rarity == RarityEnum.EPIC, 4),
            (MasterItem.rarity == RarityEnum.LEGENDARY, 5),
            (MasterItem.rarity == RarityEnum.UNIQUE, 6),
            (MasterItem.rarity == RarityEnum.ARCANA, 7),
            (MasterItem.rarity == RarityEnum.IMMORTAL, 8),
            (MasterItem.rarity == RarityEnum.BEYOND, 9),
            (MasterItem.rarity == RarityEnum.CELESTIAL, 10),
            (MasterItem.rarity == RarityEnum.DIVINE, 11),
            (MasterItem.rarity == RarityEnum.COSMIC, 12),
            else_=13
        )
        if is_desc:
            stmt = stmt.order_by(rarity_order.desc(), MasterItem.display_name.desc())
        else:
            stmt = stmt.order_by(rarity_order.asc(), MasterItem.display_name.asc())
    elif sort_by == "name":
        order_col = MasterItem.display_name
        stmt = stmt.order_by(order_col.desc() if is_desc else order_col.asc())
    elif sort_by == "level":
        order_col = MasterItem.level
        if is_desc:
            stmt = stmt.order_by(order_col.desc().nullslast(), MasterItem.display_name.desc())
        else:
            stmt = stmt.order_by(order_col.asc().nullslast(), MasterItem.display_name.asc())
    elif sort_by == "price":
        order_col = MarketSummary.lowest_price_usd
        if is_desc:
            stmt = stmt.order_by(order_col.desc().nullslast(), MasterItem.display_name.desc())
        else:
            stmt = stmt.order_by(order_col.asc().nullslast(), MasterItem.display_name.asc())
    else:
        stmt = stmt.order_by(MasterItem.display_name.asc())

    total = (await db.execute(count_stmt)).scalar_one()
    items = (
        await db.execute(stmt.offset((page - 1) * limit).limit(limit))
    ).scalars().all()
    return list(items), total


async def search_master_items(db: AsyncSession, q: str, limit: int = 20) -> list[MasterItem]:
    """
    Autocomplete search — min 2 chars enforced at route level.
    Deduplicates by (display_name, rarity): prefers the tradable variant
    (market_hash_name IS NOT NULL), falls back to the lowest id.
    """
    # Subquery: pick one id per (display_name, rarity) — lowest id within each group
    dedup_ids = (
        select(func.min(MasterItem.id))
        .where(MasterItem.display_name.ilike(f"%{q}%"))
        .group_by(MasterItem.display_name, MasterItem.rarity)
    )
    result = await db.execute(
        select(MasterItem)
        .where(MasterItem.id.in_(dedup_ids))
        .order_by(MasterItem.display_name.asc(), MasterItem.rarity.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def upsert_master_item(db: AsyncSession, data: dict[str, Any]) -> tuple[MasterItem, bool]:
    """
    Insert a master item if market_hash_name does not exist.
    If the item already exists, enrich only the fields that are currently missing.
    Returns (item, created: bool).
    """
    # Create copy to avoid mutating source payload
    data = dict(data)
    icon_url = data.pop("icon_url", None)
    if icon_url and not data.get("image_path") and str(icon_url).startswith("http"):
        data["image_path"] = icon_url

    existing = await get_master_item_by_hash(db, data["market_hash_name"])
    if existing:
        for field_name, incoming_value in data.items():
            if field_name == "market_hash_name":
                continue
            if incoming_value is None:
                continue
            if isinstance(incoming_value, str) and not incoming_value.strip():
                continue
            current_value = getattr(existing, field_name, None)
            if current_value in (None, "", [], {}):
                setattr(existing, field_name, incoming_value)
        await db.flush()
        await db.refresh(existing)
        return existing, False

    item = MasterItem(**data)
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item, True


async def count_master_items(db: AsyncSession) -> int:
    result = await db.execute(select(func.count(MasterItem.id)))
    return result.scalar_one()


# ===========================================================================
# Inventory Items
# ===========================================================================


async def get_inventory_item(db: AsyncSession, item_id: int) -> InventoryItem | None:
    return await db.get(InventoryItem, item_id)


async def get_inventory_item_by_master(
    db: AsyncSession, user_id: int, master_item_id: int
) -> InventoryItem | None:
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.user_id == user_id,
            InventoryItem.master_item_id == master_item_id,
        )
    )
    return result.scalar_one_or_none()


async def get_inventory_with_latest_prices(
    db: AsyncSession, user_id: int
) -> list[dict[str, Any]]:
    """
    Return inventory items joined with the latest price snapshot for each item.
    """
    inv_stmt = (
        select(InventoryItem)
        .where(InventoryItem.user_id == user_id)
        .options(selectinload(InventoryItem.master_item))
        .order_by(InventoryItem.added_at.desc())
    )
    inv_items = (await db.execute(inv_stmt)).scalars().all()

    results = []
    for inv in inv_items:
        price = await get_latest_price(db, inv.master_item_id)
        results.append({"inventory": inv, "price": price})
    return results


async def create_inventory_item(
    db: AsyncSession,
    user_id: int,
    master_item_id: int,
    quantity: int,
    notes: str | None,
) -> InventoryItem:
    item = InventoryItem(
        user_id=user_id,
        master_item_id=master_item_id,
        quantity=quantity,
        notes=notes,
    )
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


async def update_inventory_item(
    db: AsyncSession,
    item: InventoryItem,
    quantity: int | None = None,
    notes: str | None = None,
) -> InventoryItem:
    if quantity is not None:
        item.quantity = quantity
    if notes is not None:
        item.notes = notes
    item.updated_at = _now()
    await db.flush()
    await db.refresh(item)
    return item


async def delete_inventory_item(db: AsyncSession, item: InventoryItem) -> None:
    await db.delete(item)
    await db.flush()


async def bulk_delete_inventory_items(
    db: AsyncSession, user_id: int, item_ids: list[int]
) -> int:
    result = await db.execute(
        delete(InventoryItem).where(
            InventoryItem.id.in_(item_ids),
            InventoryItem.user_id == user_id,
        )
    )
    return result.rowcount


async def get_inventory_summary(db: AsyncSession, user_id: int) -> dict[str, Any]:
    """
    Compute summary stats: total unique items, total quantity,
    total value in IDR/USD, highest value item, last refresh time.
    """
    inv_stmt = (
        select(InventoryItem)
        .where(InventoryItem.user_id == user_id)
        .options(selectinload(InventoryItem.master_item))
    )
    inv_items = (await db.execute(inv_stmt)).scalars().all()

    total_unique = len(inv_items)
    total_quantity = sum(i.quantity for i in inv_items)
    total_value_idr = 0.0
    total_value_usd = 0.0
    highest_value_item: dict | None = None
    highest_val = 0.0

    for inv in inv_items:
        price = await get_latest_price(db, inv.master_item_id)
        if price and price.lowest_price_idr:
            val_idr = price.lowest_price_idr * inv.quantity
            total_value_idr += val_idr
            if val_idr > highest_val:
                highest_val = val_idr
                highest_value_item = {
                    "inventory_id": inv.id,
                    "master_item_id": inv.master_item_id,
                    "display_name": inv.master_item.display_name,
                    "total_value_idr": val_idr,
                }
        if price and price.lowest_price_usd:
            total_value_usd += price.lowest_price_usd * inv.quantity

    # Try to get latest price refresh or sync time from settings first
    last_val = await get_setting(db, "last_run_at")
    if last_val:
        last_refresh = last_val
    else:
        # Fallback to get latest completed sync log completion timestamp
        sync_stmt = (
            select(SyncLog.completed_at)
            .where(SyncLog.status == "success")
            .order_by(SyncLog.completed_at.desc())
            .limit(1)
        )
        sync_res = await db.execute(sync_stmt)
        last_completed = sync_res.scalar_one_or_none()
        last_refresh = last_completed.isoformat() if last_completed else None

    return {
        "total_unique_items": total_unique,
        "total_quantity": total_quantity,
        "total_value_idr": round(total_value_idr, 2),
        "total_value_usd": round(total_value_usd, 2),
        "highest_value_item": highest_value_item,
        "last_refreshed_at": last_refresh,
    }


async def get_all_inventory_master_ids(db: AsyncSession) -> list[int]:
    """Get all distinct master_item_ids across ALL users (for scheduler)."""
    result = await db.execute(
        select(InventoryItem.master_item_id).distinct()
    )
    return list(result.scalars().all())


# ===========================================================================
# Price History
# ===========================================================================


async def get_latest_price(
    db: AsyncSession, master_item_id: int
) -> PriceHistory | None:
    # Query optimized latest market data
    result = await db.execute(
        select(MarketSummary).where(MarketSummary.master_item_id == master_item_id)
    )
    summary = result.scalar_one_or_none()
    if summary:
        return PriceHistory(
            master_item_id=summary.master_item_id,
            lowest_price_idr=summary.latest_price_idr,
            median_price_idr=summary.median_price_idr,
            lowest_price_usd=summary.latest_price_usd,
            median_price_usd=summary.median_price_usd,
            volume=summary.volume,
            fetch_status=summary.market_status,
            fetched_at=summary.last_checked or _now()
        )

    # Fallback to historic list if summary row is missing
    hist_result = await db.execute(
        select(PriceHistory)
        .where(PriceHistory.master_item_id == master_item_id)
        .order_by(desc(PriceHistory.fetched_at))
        .limit(1)
    )
    return hist_result.scalar_one_or_none()


async def get_price_history(
    db: AsyncSession, master_item_id: int, days: int = 30
) -> list[PriceHistory]:
    cutoff = _now() - timedelta(days=days)
    result = await db.execute(
        select(PriceHistory)
        .where(
            PriceHistory.master_item_id == master_item_id,
            PriceHistory.fetched_at >= cutoff,
        )
        .order_by(PriceHistory.fetched_at.asc())
    )
    return list(result.scalars().all())


async def upsert_market_summary(
    db: AsyncSession,
    master_item_id: int,
    market_hash_name: str,
    latest_price_idr: float | None,
    latest_price_usd: float | None,
    median_price_idr: float | None,
    median_price_usd: float | None,
    volume: int | None,
    market_status: str,
    market_url: str | None = None,
) -> MarketSummary:
    """Create or update a MarketSummary record for a master item."""
    result = await db.execute(
        select(MarketSummary).where(MarketSummary.master_item_id == master_item_id)
    )
    summary = result.scalar_one_or_none()
    
    now_ts = _now()
    
    if not summary:
        summary = MarketSummary(
            master_item_id=master_item_id,
            market_hash_name=market_hash_name,
            market_url=market_url,
            latest_price_idr=latest_price_idr,
            latest_price_usd=latest_price_usd,
            median_price_idr=median_price_idr,
            median_price_usd=median_price_usd,
            volume=volume,
            currency="USD",
            market_status=market_status,
            last_checked=now_ts,
        )
        db.add(summary)
    else:
        summary.latest_price_idr = latest_price_idr
        summary.latest_price_usd = latest_price_usd
        summary.median_price_idr = median_price_idr
        summary.median_price_usd = median_price_usd
        summary.volume = volume
        if market_url is not None:
            summary.market_url = market_url
        summary.last_checked = now_ts
        summary.market_status = market_status

    await db.flush()
    return summary


async def create_price_snapshot(
    db: AsyncSession,
    master_item_id: int,
    lowest_price_idr: float | None,
    median_price_idr: float | None,
    lowest_price_usd: float | None,
    median_price_usd: float | None,
    volume: int | None,
    fetch_status: str,
) -> PriceHistory:
    snapshot = PriceHistory(
        master_item_id=master_item_id,
        lowest_price_idr=lowest_price_idr,
        median_price_idr=median_price_idr,
        lowest_price_usd=lowest_price_usd,
        median_price_usd=median_price_usd,
        volume=volume,
        fetch_status=fetch_status,
    )
    db.add(snapshot)
    await db.flush()
    await db.refresh(snapshot)
    return snapshot


# ===========================================================================
# Price Alerts
# ===========================================================================


async def get_active_alerts(db: AsyncSession, user_id: int) -> list[PriceAlert]:
    result = await db.execute(
        select(PriceAlert)
        .where(PriceAlert.user_id == user_id, PriceAlert.is_active == True)
        .options(selectinload(PriceAlert.master_item))
        .order_by(desc(PriceAlert.created_at))
    )
    return list(result.scalars().all())


async def get_all_active_alerts(db: AsyncSession) -> list[PriceAlert]:
    """All active alerts across all users — used by alert checker."""
    result = await db.execute(
        select(PriceAlert)
        .where(
            PriceAlert.is_active == True,
            PriceAlert.expires_at > _now(),
        )
        .options(selectinload(PriceAlert.master_item))
    )
    return list(result.scalars().all())


async def get_alert_by_id(
    db: AsyncSession, alert_id: int, user_id: int
) -> PriceAlert | None:
    result = await db.execute(
        select(PriceAlert).where(
            PriceAlert.id == alert_id, PriceAlert.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def create_alert(
    db: AsyncSession,
    user_id: int,
    master_item_id: int,
    alert_type: str,
    currency: str,
    target_value: float,
    direction: str | None,
) -> PriceAlert:
    alert = PriceAlert(
        user_id=user_id,
        master_item_id=master_item_id,
        alert_type=alert_type,
        currency=currency,
        target_value=target_value,
        direction=direction,
        expires_at=_now() + timedelta(days=30),
    )
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert


async def deactivate_alert(db: AsyncSession, alert: PriceAlert) -> PriceAlert:
    alert.is_active = False
    alert.triggered_at = _now()
    await db.flush()
    return alert


async def delete_alert(db: AsyncSession, alert: PriceAlert) -> None:
    await db.delete(alert)
    await db.flush()


async def expire_old_alerts(db: AsyncSession) -> int:
    """Deactivate alerts past their expiry date."""
    result = await db.execute(
        update(PriceAlert)
        .where(PriceAlert.is_active == True, PriceAlert.expires_at <= _now())
        .values(is_active=False)
    )
    return result.rowcount


async def get_triggered_alerts(
    db: AsyncSession, user_id: int
) -> list[PriceAlert]:
    result = await db.execute(
        select(PriceAlert)
        .where(
            PriceAlert.user_id == user_id,
            PriceAlert.triggered_at.is_not(None),
        )
        .options(selectinload(PriceAlert.master_item))
        .order_by(desc(PriceAlert.triggered_at))
    )
    return list(result.scalars().all())


# ===========================================================================
# Notifications
# ===========================================================================


async def create_notification(
    db: AsyncSession,
    user_id: int,
    alert_id: int,
    master_item_id: int,
    message: str,
    triggered_price_idr: float | None,
    triggered_price_usd: float | None,
    target_value: float,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        alert_id=alert_id,
        master_item_id=master_item_id,
        message=message,
        triggered_price_idr=triggered_price_idr,
        triggered_price_usd=triggered_price_usd,
        target_value=target_value,
    )
    db.add(notif)
    await db.flush()
    await db.refresh(notif)
    return notif


async def get_notifications(
    db: AsyncSession, user_id: int, unread_only: bool = False
) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.user_id == user_id)
        .options(selectinload(Notification.master_item))
        .order_by(desc(Notification.created_at))
    )
    if unread_only:
        stmt = stmt.where(Notification.is_read == False)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_unread_count(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == user_id, Notification.is_read == False
        )
    )
    return result.scalar_one()


async def get_unread_notifications(
    db: AsyncSession, user_id: int
) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .options(selectinload(Notification.master_item))
        .order_by(Notification.created_at.asc())
    )
    return list(result.scalars().all())


async def mark_notification_read(
    db: AsyncSession, notif_id: int, user_id: int
) -> Notification | None:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id, Notification.user_id == user_id
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.flush()
    return notif


async def mark_all_notifications_read(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.is_read == False)
        .values(is_read=True)
    )
    return result.rowcount


async def delete_notification(
    db: AsyncSession, notif_id: int, user_id: int
) -> bool:
    result = await db.execute(
        delete(Notification).where(
            Notification.id == notif_id, Notification.user_id == user_id
        )
    )
    return result.rowcount > 0


async def delete_all_notifications(db: AsyncSession, user_id: int) -> int:
    """Delete all notifications for a user. Returns number of deleted rows."""
    result = await db.execute(
        delete(Notification).where(Notification.user_id == user_id)
    )
    return result.rowcount

# ===========================================================================
# App Settings
# ===========================================================================


async def get_setting(db: AsyncSession, key: str) -> str | None:
    row = await db.get(AppSetting, key)
    return row.value if row else None


async def get_all_settings(db: AsyncSession) -> dict[str, str]:
    result = await db.execute(select(AppSetting))
    return {row.key: row.value for row in result.scalars().all()}


async def set_setting(db: AsyncSession, key: str, value: str) -> AppSetting:
    row = await db.get(AppSetting, key)
    if row:
        row.value = str(value)
        row.updated_at = _now()
    else:
        row = AppSetting(key=key, value=str(value))
        db.add(row)
    await db.flush()
    return row


async def update_settings(
    db: AsyncSession, updates: dict[str, str]
) -> dict[str, str]:
    for key, value in updates.items():
        await set_setting(db, key, value)
    return await get_all_settings(db)
