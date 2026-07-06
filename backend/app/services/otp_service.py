"""
OTP Service — high-level orchestration for OTP lifecycle management.

This service does NOT know about Register, Forgot Password, or Delete Account.
It only manages OTP generation, verification, resending, and cleanup.
Callers are responsible for sending the email and handling business logic.

Usage example (future endpoint):
    ctx = await generate_and_store(db, user.id, OtpPurposeEnum.REGISTER)
    # caller sends ctx.otp via email to user.email
    success = await verify(db, user.id, OtpPurposeEnum.REGISTER, otp_plain)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from string import Template

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.otp_generator import generate_otp
from app.core.otp_hashing import hash_otp, verify_otp
from app.db.models import OtpPurposeEnum
from app.repositories import otp_repository
from app.schemas.otp import OtpContext

logger = logging.getLogger(__name__)

# Path to the shared HTML email template
_TEMPLATE_PATH = Path(__file__).parent.parent / "templates" / "email" / "otp_email.html"


def _load_email_template(
    title: str,
    subtitle: str,
    otp: str,
    expire_minutes: int,
    footer: str,
) -> str:
    """Render the OTP HTML email template with the given variables."""
    raw = _TEMPLATE_PATH.read_text(encoding="utf-8")
    return Template(raw).substitute(
        title=title,
        subtitle=subtitle,
        otp=otp,
        expire_minutes=expire_minutes,
        footer=footer,
    )


async def generate_and_store(
    db: AsyncSession,
    user_id: int,
    purpose: OtpPurposeEnum,
) -> OtpContext:
    """
    Generate a new OTP, hash and store it, then return an OtpContext with
    the plaintext OTP for the caller to email.

    Previous active OTPs for this user+purpose are invalidated immediately.

    Args:
        db: Async database session.
        user_id: ID of the target user.
        purpose: OTP purpose (REGISTER, RESET_PASSWORD, DELETE_ACCOUNT).

    Returns:
        OtpContext containing the plaintext OTP and expiry timestamp.
    """
    # Clean up any previous active OTPs for this user+purpose
    await otp_repository.invalidate_previous(db, user_id, purpose)

    otp_plain = generate_otp()
    otp_hashed = hash_otp(otp_plain)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.otp_expire_minutes)

    await otp_repository.create_otp(db, user_id, purpose, otp_hashed, expires_at)
    logger.info(
        "OTP generated for user_id=%d purpose=%s expires_at=%s",
        user_id,
        purpose.value,
        expires_at.isoformat(),
    )

    return OtpContext(otp=otp_plain, expires_at=expires_at, purpose=purpose)


async def verify(
    db: AsyncSession,
    user_id: int,
    purpose: OtpPurposeEnum,
    otp_plain: str,
) -> bool:
    """
    Verify a plaintext OTP against the stored hash.

    - Returns True and marks the OTP as used on success.
    - Returns False and increments the attempt counter on failure.
    - Raises HTTP 429 if max attempts are exceeded.
    - Raises HTTP 400 if no active OTP exists (expired or never generated).

    Args:
        db: Async database session.
        user_id: ID of the target user.
        purpose: OTP purpose.
        otp_plain: Plaintext OTP submitted by the user.

    Returns:
        True if verification succeeded.

    Raises:
        HTTPException 400: No active OTP found.
        HTTPException 429: Max verification attempts exceeded.
    """
    record = await otp_repository.get_active_otp(db, user_id, purpose)

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found. It may have expired or already been used.",
        )

    if record.attempts >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum verification attempts ({settings.otp_max_attempts}) exceeded. "
                   "Please request a new OTP.",
        )

    if verify_otp(otp_plain, record.otp_hash):
        await otp_repository.mark_used(db, record)
        logger.info(
            "OTP verified for user_id=%d purpose=%s", user_id, purpose.value
        )
        return True

    await otp_repository.increment_attempt(db, record)
    logger.warning(
        "OTP mismatch for user_id=%d purpose=%s attempt=%d/%d",
        user_id,
        purpose.value,
        record.attempts,
        settings.otp_max_attempts,
    )
    return False


async def resend(
    db: AsyncSession,
    user_id: int,
    purpose: OtpPurposeEnum,
) -> OtpContext:
    """
    Resend an OTP by generating a new one.

    Enforces resend cooldown and max resend count.
    The old OTP is invalidated and a fresh one is stored.

    Args:
        db: Async database session.
        user_id: ID of the target user.
        purpose: OTP purpose.

    Returns:
        OtpContext with the new plaintext OTP.

    Raises:
        HTTPException 429: Resend cooldown not elapsed or max resend reached.
    """
    record = await otp_repository.get_active_otp(db, user_id, purpose)

    if record is not None:
        if record.resend_count >= settings.otp_max_resend:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Maximum resend limit ({settings.otp_max_resend}) reached. "
                       "Please wait and try again later.",
            )

        if not record.can_resend(settings.otp_resend_seconds, settings.otp_max_resend):
            remaining = record.remaining_seconds()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {remaining} second(s) before requesting a new OTP.",
            )

    # Generate a fresh OTP (invalidates the old one internally)
    ctx = await generate_and_store(db, user_id, purpose)
    logger.info(
        "OTP resent for user_id=%d purpose=%s", user_id, purpose.value
    )
    return ctx


async def cleanup(db: AsyncSession) -> int:
    """
    Delete all expired OTP records from the database.

    Returns:
        Number of records deleted.
    """
    return await otp_repository.delete_expired(db)


def render_otp_email(
    title: str,
    subtitle: str,
    otp: str,
    expire_minutes: int | None = None,
    footer: str = "© TBH Price Tracker",
) -> str:
    """
    Render the shared OTP HTML email template.

    Args:
        title: Email heading (e.g. "Verify your email").
        subtitle: Supporting sentence below the heading.
        otp: The plaintext OTP code to display.
        expire_minutes: Expiry window in minutes (defaults to settings value).
        footer: Footer text (defaults to app name).

    Returns:
        Rendered HTML string ready to pass to email_service.send_html().
    """
    minutes = expire_minutes if expire_minutes is not None else settings.otp_expire_minutes
    return _load_email_template(
        title=title,
        subtitle=subtitle,
        otp=otp,
        expire_minutes=minutes,
        footer=footer,
    )
