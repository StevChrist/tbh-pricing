"""
SQLAlchemy ORM models for TBH Inventory Price Tracker.
All tables: users, master_items, market_summary, inventory_items,
price_history, price_alerts, notifications, app_settings, sync_logs.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    LargeBinary,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class RarityEnum(str, enum.Enum):
    COMMON = "COMMON"
    UNCOMMON = "UNCOMMON"
    RARE = "RARE"
    EPIC = "EPIC"
    LEGENDARY = "LEGENDARY"
    UNIQUE = "UNIQUE"
    IMMORTAL = "IMMORTAL"
    ARCANA = "ARCANA"
    BEYOND = "BEYOND"
    CELESTIAL = "CELESTIAL"
    DIVINE = "DIVINE"
    COSMIC = "COSMIC"


class ClassEnum(str, enum.Enum):
    KNIGHT = "Knight"
    RANGER = "Ranger"
    SORCERER = "Sorcerer"
    PRIEST = "Priest"
    HUNTER = "Hunter"
    SLAYER = "Slayer"


class GearEnum(str, enum.Enum):
    AMULET = "Amulet"
    ARMOR = "Armor"
    AXE = "Axe"
    BOLT = "Bolt"
    BOOTS = "Boots"
    BOW = "Bow"
    BRACER = "Bracer"
    CROSSBOW = "Crossbow"
    EARING = "Earing"
    GLOVES = "Gloves"
    HATCHET = "Hatchet"
    HELMET = "Helmet"
    ORB = "Orb"
    RING = "Ring"
    SCEPTER = "Scepter"
    SHIELD = "Shield"
    STAFF = "Staff"
    SWORD = "Sword"
    TOME = "Tome"
    WAND = "Wand"


class ItemTypeEnum(str, enum.Enum):
    ALL_TYPE = "All Type"
    GEAR = "Gear"
    MATERIAL = "Material"
    STAGEBOX = "Stagebox"


class FetchStatusEnum(str, enum.Enum):
    OK = "ok"
    UNAVAILABLE = "unavailable"
    ERROR = "error"


class AlertTypeEnum(str, enum.Enum):
    PRICE_BELOW = "price_below"
    PRICE_ABOVE = "price_above"
    PERCENT_CHANGE = "percent_change"


class AlertCurrencyEnum(str, enum.Enum):
    IDR = "IDR"
    USD = "USD"


class AlertDirectionEnum(str, enum.Enum):
    UP = "up"
    DOWN = "down"


# ---------------------------------------------------------------------------
# Base
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Table: users
# ---------------------------------------------------------------------------


class User(Base):
    """Application user. Supports login + registration."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # OAuth and verification preparation fields
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    role: Mapped[str] = mapped_column(String(32), default="user", server_default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    
    # Activity & IP Tracking
    last_ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    daily_active_seconds: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    active_date: Mapped[str | None] = mapped_column(String(10), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, server_default=func.now()
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    price_alerts: Mapped[list["PriceAlert"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_users_google_auth", "google_id"),
    )


# ---------------------------------------------------------------------------
# Table: market_summary
# ---------------------------------------------------------------------------


class MarketSummary(Base):
    """Latest dynamic Steam Community Market information for a master item."""

    __tablename__ = "market_summary"

    master_item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("master_items.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    market_hash_name: Mapped[str] = mapped_column(
        String(512),
        unique=True,
        nullable=False,
        index=True,
    )
    market_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    latest_price_idr: Mapped[float | None] = mapped_column(Float, nullable=True)
    latest_price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    median_price_idr: Mapped[float | None] = mapped_column(Float, nullable=True)
    median_price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(16), nullable=True, default="USD")
    market_status: Mapped[str] = mapped_column(String(32), default="ok", nullable=False)
    last_checked: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    master_item: Mapped["MasterItem"] = relationship(back_populates="market_summary")


# ---------------------------------------------------------------------------
# Table: master_items
# ---------------------------------------------------------------------------


class MasterItem(Base):
    """
    Canonical TBH item static metadata list.
    Sourced authoritative details from taskbarherowiki.com items catalog.
    Dynamic price/market attributes are isolated.
    """

    __tablename__ = "master_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    internal_item_id: Mapped[int | None] = mapped_column(Integer, unique=True, nullable=True, index=True)
    market_hash_name: Mapped[str | None] = mapped_column(String(512), unique=True, nullable=True, index=True)
    display_name: Mapped[str] = mapped_column(String(512), nullable=False)
    normalized_name: Mapped[str | None] = mapped_column(String(512), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    item_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    rarity: Mapped[str | None] = mapped_column(
        Enum(RarityEnum, name="rarity_enum"), nullable=True
    )
    gear_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    class_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stats: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    item_metadata: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    
    # Serves local WebP image files
    image_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    image_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    image_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now, server_default=func.now()
    )

    @property
    def icon_url(self) -> str | None:
        if self.image_data:
            return f"http://localhost:8000/api/v1/items/{self.id}/icon"
        if self.image_path:
            if self.image_path.startswith("http"):
                return self.image_path
            return f"http://localhost:8000{self.image_path}"
        return None

    # Relationships
    inventory_items: Mapped[list["InventoryItem"]] = relationship(back_populates="master_item")
    price_history: Mapped[list["PriceHistory"]] = relationship(back_populates="master_item", cascade="all, delete-orphan")
    price_alerts: Mapped[list["PriceAlert"]] = relationship(back_populates="master_item")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="master_item")
    market_summary: Mapped[MarketSummary | None] = relationship(
        back_populates="master_item", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_master_items_filters", "rarity", "item_type", "gear_type", "class_type", "level"),
    )


# ---------------------------------------------------------------------------
# Table: inventory_items
# ---------------------------------------------------------------------------


class InventoryItem(Base):
    """
    User-owned items. One row per unique master item per user.
    Enforced by UNIQUE(user_id, master_item_id).
    """

    __tablename__ = "inventory_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    master_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("master_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_now,
        onupdate=_now,
        server_default=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="inventory_items")
    master_item: Mapped["MasterItem"] = relationship(back_populates="inventory_items")

    __table_args__ = (
        UniqueConstraint("user_id", "master_item_id", name="uq_inventory_user_item"),
    )


# ---------------------------------------------------------------------------
# Table: price_history
# ---------------------------------------------------------------------------


class PriceHistory(Base):
    """
    Time-series price snapshots per item, storing both IDR and USD.
    Written by the scheduler only when pricing fluctuations occur.
    """

    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    master_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("master_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lowest_price_idr: Mapped[float | None] = mapped_column(Float, nullable=True)
    median_price_idr: Mapped[float | None] = mapped_column(Float, nullable=True)
    lowest_price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    median_price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    volume: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fetch_status: Mapped[str] = mapped_column(
        Enum(FetchStatusEnum, name="fetch_status_enum"),
        default=FetchStatusEnum.OK,
        nullable=False,
    )
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now(), index=True
    )

    # Relationships
    master_item: Mapped["MasterItem"] = relationship(back_populates="price_history")

    __table_args__ = (
        Index("idx_price_history_item_date", "master_item_id", "fetched_at"),
    )


# ---------------------------------------------------------------------------
# Table: price_alerts
# ---------------------------------------------------------------------------


class PriceAlert(Base):
    """
    User-defined price alert conditions.
    Expires 30 days after creation if never triggered.
    """

    __tablename__ = "price_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    master_item_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("master_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    alert_type: Mapped[str] = mapped_column(
        Enum(AlertTypeEnum, name="alert_type_enum"), nullable=False
    )
    currency: Mapped[str] = mapped_column(
        Enum(AlertCurrencyEnum, name="alert_currency_enum"), nullable=False
    )
    target_value: Mapped[float] = mapped_column(Float, nullable=False)
    direction: Mapped[str | None] = mapped_column(
        Enum(AlertDirectionEnum, name="alert_direction_enum"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="price_alerts")
    master_item: Mapped["MasterItem"] = relationship(back_populates="price_alerts")
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="alert", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_price_alerts_active", "is_active", "expires_at"),
    )


# ---------------------------------------------------------------------------
# Table: notifications
# ---------------------------------------------------------------------------


class Notification(Base):
    """
    In-app notification records generated when a price alert condition is met.
    Displayed in the pop-up carousel and message tab.
    """

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    alert_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("price_alerts.id", ondelete="CASCADE"), nullable=True
    )
    master_item_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("master_items.id", ondelete="CASCADE"), nullable=True
    )
    notification_type: Mapped[str] = mapped_column(
        String(32), default="message", server_default="message", nullable=False
    )
    message: Mapped[str] = mapped_column(Text, nullable=False)
    triggered_price_idr: Mapped[float | None] = mapped_column(Float, nullable=True)
    triggered_price_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now(), index=True
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="notifications")
    alert: Mapped["PriceAlert"] = relationship(back_populates="notifications")
    master_item: Mapped["MasterItem"] = relationship(back_populates="notifications")


# ---------------------------------------------------------------------------
# Table: app_settings
# ---------------------------------------------------------------------------


class AppSetting(Base):
    """
    Key-value application configuration.
    Seeded with defaults on first startup.
    """

    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_now,
        onupdate=_now,
        server_default=func.now(),
    )


# ---------------------------------------------------------------------------
# Table: sync_logs
# ---------------------------------------------------------------------------


class SyncLog(Base):
    """Logs detailing sync status, metrics, durations, and traceback details on failures."""

    __tablename__ = "sync_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    sync_mode: Mapped[str] = mapped_column(String(32), nullable=False)  # 'full' or 'daily'
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)  # 'success', 'failed', 'partial'
    items_imported: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    items_skipped: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicates_detected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    validation_errors: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prices_updated: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    images_downloaded: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    images_reused: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failures_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)


# ---------------------------------------------------------------------------
# Table: activity_logs
# ---------------------------------------------------------------------------


class ActivityLog(Base):
    """Logs detailing user or system activities (login, updates, deletions)."""

    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    username: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, server_default=func.now(), index=True
    )

    # Relationships
    user: Mapped[User | None] = relationship()
