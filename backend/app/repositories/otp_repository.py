"""
OTP Repository — all database operations for the user_otps table.

Plain async functions, consistent with the style in app/db/crud.py.
No class, no abstraction layer. Each function does exactly one thing.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import OtpPurposeEnum, UserOtp

logger = logging.getLogger(__name__)


async def create_otp(
    db: AsyncSession,
    user_id: int,
    purpose: OtpPurposeEnum,
    otp_hash: str,
    expires_at: datetime,
) -> UserOtp:
    """Insert a new OTP record and return it."""
    now = datetime.now(timezone.utc)
    record = UserOtp(
        user_id=user_id,
        purpose=purpose,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        resend_count=0,
        last_sent_at=now,
        used_at=None,
    )
    db.add(record)
    await db.flush()  # populate id without committing
    await db.refresh(record)
    return record


async def get_active_otp(
    db: AsyncSession,
    user_id: int,
    purpose: OtpPurposeEnum,
) -> UserOtp | None:
    """
    Fetch the most recent OTP for user+purpose that is not expired and not used.
    Returns None if no active OTP exists.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(UserOtp)
        .where(
            UserOtp.user_id == user_id,
            UserOtp.purpose == purpose,
            UserOtp.used_at.is_(None),
            UserOtp.expires_at > now,
        )
        .order_by(UserOtp.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def invalidate_previous(
    db: AsyncSession,
    user_id: int,
    purpose: OtpPurposeEnum,
) -> None:
    """
    Mark all active OTPs for user+purpose as used.
    Called before generating a new OTP to prevent parallel valid OTPs.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(UserOtp).where(
            UserOtp.user_id == user_id,
            UserOtp.purpose == purpose,
            UserOtp.used_at.is_(None),
        )
    )
    records = result.scalars().all()
    for record in records:
        record.used_at = now
        record.updated_at = now
    logger.debug(
        "Invalidated %d previous OTP(s) for user_id=%d purpose=%s",
        len(records),
        user_id,
        purpose.value,
    )


async def mark_used(db: AsyncSession, otp: UserOtp) -> UserOtp:
    """Mark an OTP as successfully used."""
    now = datetime.now(timezone.utc)
    otp.used_at = now
    otp.updated_at = now
    await db.flush()
    return otp


async def increment_attempt(db: AsyncSession, otp: UserOtp) -> UserOtp:
    """Increment the failed attempt counter by 1."""
    otp.attempts += 1
    otp.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return otp


async def increment_resend(db: AsyncSession, otp: UserOtp) -> UserOtp:
    """Increment the resend counter and update last_sent_at."""
    now = datetime.now(timezone.utc)
    otp.resend_count += 1
    otp.last_sent_at = now
    otp.updated_at = now
    await db.flush()
    return otp


async def delete_expired(db: AsyncSession) -> int:
    """
    Delete all expired OTP records.
    Returns the number of rows deleted.

    Call this from a maintenance task or before creating a new OTP to keep
    the table small. No scheduler is included — callers decide when to run it.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        delete(UserOtp).where(UserOtp.expires_at <= now)
    )
    count = result.rowcount
    if count:
        logger.info("Deleted %d expired OTP record(s).", count)
    return count
