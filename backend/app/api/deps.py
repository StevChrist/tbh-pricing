"""
FastAPI dependencies — authentication guard and DB session provider.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.db import crud
from app.db.database import get_db
from app.db.models import User

logger = logging.getLogger(__name__)


async def get_current_user(
    response: Response,
    request: Request,
    access_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Extract and validate the JWT from the httpOnly cookie.
    Raises HTTP 401 if the token is missing, invalid, or the user not found.
    Handles sliding session renewal and absolute session maximum age (30 days).
    """
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = security.decode_access_token(access_token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: int | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    # 1. Check absolute session duration (30 days maximum age)
    session_start: int | None = payload.get("session_start")
    now_dt = datetime.now(timezone.utc)
    now_ts = int(now_dt.timestamp())

    if session_start is None:
        # Fallback to current time if missing to prevent immediately breaking existing logins
        session_start = now_ts

    absolute_expiry_ts = session_start + (security.SESSION_MAX_AGE_DAYS * 24 * 60 * 60)
    if now_ts >= absolute_expiry_ts:
        response.delete_cookie(key="access_token")
        logger.info("Session absolutely expired for user id=%s. Max age reached.", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired (maximum lifetime reached)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Check if we need to refresh (slide) the session
    # We slide if the remaining duration of the token is less than 5 days
    exp: int | None = payload.get("exp")
    if exp is not None:
        remaining_seconds = exp - now_ts
        if remaining_seconds < (5 * 24 * 60 * 60):
            # Calculate new expiration, which cannot exceed the absolute expiry
            new_exp_ts = min(now_ts + (security.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60), absolute_expiry_ts)
            # Only refresh if the extension is at least 60 seconds
            if new_exp_ts - exp > 60:
                new_expires_delta = timedelta(seconds=(new_exp_ts - now_ts))
                new_token = security.create_access_token(
                    data={"sub": str(user_id), "session_start": session_start},
                    expires_delta=new_expires_delta,
                )
                response.set_cookie(
                    key="access_token",
                    value=new_token,
                    httponly=True,
                    samesite="lax",
                    max_age=int(new_exp_ts - now_ts),
                    secure=False,
                )
                logger.info("Session extended/slid for user id=%s. New expiry: %s", user_id, datetime.fromtimestamp(new_exp_ts, tz=timezone.utc))

    user = await crud.get_user_by_id(db, int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Track User Activity & IP address
    ip = request.client.host if request.client else "unknown"
    user.last_ip_address = ip

    now = datetime.now(timezone.utc)
    today_str = now.date().isoformat()

    # Reset if a new day starts
    if user.active_date != today_str:
        user.active_date = today_str
        user.daily_active_seconds = 0

    if user.last_active_at is not None:
        # Accumulate active duration if subsequent request is within 15 minutes (900 seconds)
        last_active = user.last_active_at.replace(tzinfo=timezone.utc) if user.last_active_at.tzinfo is None else user.last_active_at
        diff = (now - last_active).total_seconds()
        if 0 < diff < 900:
            user.daily_active_seconds += int(diff)

    user.last_active_at = now
    await db.commit()

    return user
