"""
FastAPI dependencies — authentication guard and DB session provider.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.config import settings
from app.db import crud
from app.db.database import get_db
from app.db.models import User

import time
from collections import defaultdict

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    """
    Lightweight, in-process rate limiter using IP address history.
    Stores timestamps in memory; no external dependencies like Redis.
    """

    def __init__(self, requests_limit: int, window_seconds: int):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self.history: dict[str, list[float]] = defaultdict(list)

    async def __call__(self, request: Request) -> None:
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        # Evict timestamps outside the sliding window
        self.history[client_ip] = [
            ts for ts in self.history[client_ip]
            if now - ts < self.window_seconds
        ]

        if len(self.history[client_ip]) >= self.requests_limit:
            logger.warning(
                "Rate limit exceeded for IP %s: %d requests in %ds limit",
                client_ip, self.requests_limit, self.window_seconds
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )

        self.history[client_ip].append(now)


# Configure rate limiters for auth endpoints
login_rate_limiter = InMemoryRateLimiter(requests_limit=10, window_seconds=60)
auth_rate_limiter = InMemoryRateLimiter(requests_limit=5, window_seconds=60)

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

    # Validate active session state in DB
    session_id: str | None = payload.get("session_id")
    if session_id:
        from app.db.models import UserSession
        from sqlalchemy import select
        
        session_result = await db.execute(
            select(UserSession).where(UserSession.id == session_id)
        )
        user_session = session_result.scalar_one_or_none()
        
        if user_session is None or not user_session.is_active:
            response.delete_cookie(
                key="access_token",
                httponly=True,
                samesite="lax",
                secure=settings.secure_cookies,
            )
            
            # Log failure to history
            ip = request.client.host if request.client else "unknown"
            user_agent_str = request.headers.get("user-agent", "unknown")
            try:
                from app.api.routes.auth import parse_user_agent
                browser, os, device = parse_user_agent(user_agent_str)
            except Exception:
                browser, os, device = "Unknown", "Unknown", "Unknown"

            from app.db.models import UserLoginHistory
            login_history = UserLoginHistory(
                user_id=int(user_id) if user_id else None,
                ip_address=ip,
                result="FAILURE",
                status="FAILURE",
                reason="SESSION_REVOKED",
                browser=browser,
                os=os,
                device=device,
                timestamp=datetime.now(timezone.utc),
            )
            db.add(login_history)
            
            await crud.log_activity(
                db,
                user_id=int(user_id) if user_id else None,
                username=None,
                action="session_revoked",
                details=f"Session rejected (terminated/inactive): {session_id}",
                ip_address=ip
            )
            await db.commit()
            
            logger.info("Session ID %s is terminated or inactive", session_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session invalidated. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Update last activity at for the session (throttled to once a minute)
        now_dt = datetime.now(timezone.utc)
        last_act = user_session.last_activity_at.replace(tzinfo=timezone.utc) if user_session.last_activity_at.tzinfo is None else user_session.last_activity_at
        if (now_dt - last_act).total_seconds() > 60:
            user_session.last_activity_at = now_dt
            user_session.ip_address = request.client.host if request.client else "unknown"

    # 1. Check absolute session duration (30 days maximum age)
    session_start: int | None = payload.get("session_start")
    now_dt = datetime.now(timezone.utc)
    now_ts = int(now_dt.timestamp())

    if session_start is None:
        # Fallback to current time if missing to prevent immediately breaking existing logins
        session_start = now_ts

    absolute_expiry_ts = session_start + (security.SESSION_MAX_AGE_DAYS * 24 * 60 * 60)
    if now_ts >= absolute_expiry_ts:
        response.delete_cookie(
            key="access_token",
            httponly=True,
            samesite="lax",
            secure=settings.secure_cookies,
        )
        
        # Log expired session
        ip = request.client.host if request.client else "unknown"
        user_agent_str = request.headers.get("user-agent", "unknown")
        try:
            from app.api.routes.auth import parse_user_agent
            browser, os, device = parse_user_agent(user_agent_str)
        except Exception:
            browser, os, device = "Unknown", "Unknown", "Unknown"
            
        from app.db.models import UserLoginHistory
        login_history = UserLoginHistory(
            user_id=int(user_id) if user_id else None,
            ip_address=ip,
            result="FAILURE",
            status="FAILURE",
            reason="EXPIRED_SESSION",
            browser=browser,
            os=os,
            device=device,
            timestamp=datetime.now(timezone.utc),
        )
        db.add(login_history)
        
        # Deactivate session in DB if it was active
        if session_id:
            from app.db.models import UserSession
            from sqlalchemy import select
            res = await db.execute(select(UserSession).where(UserSession.id == session_id))
            user_session = res.scalar_one_or_none()
            if user_session:
                user_session.is_active = False
                
        await crud.log_activity(
            db,
            user_id=int(user_id) if user_id else None,
            username=None,
            action="session_expired",
            details=f"Session absolutely expired: {session_id}",
            ip_address=ip
        )
        await db.commit()
        
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
                    data={"sub": str(user_id), "session_start": session_start, "session_id": session_id},
                    expires_delta=new_expires_delta,
                )
                response.set_cookie(
                    key="access_token",
                    value=new_token,
                    httponly=True,
                    samesite="lax",
                    max_age=int(new_exp_ts - now_ts),
                    secure=settings.secure_cookies,
                )
                logger.info("Session extended/slid for user id=%s. New expiry: %s", user_id, datetime.fromtimestamp(new_exp_ts, tz=timezone.utc))

    user = await crud.get_user_by_id(db, int(user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Check if user is suspended or banned
    if user.status == "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact the administrator.",
        )
    if user.status == "BANNED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been permanently banned.",
        )

    # Check if session was forced out
    if user.sessions_invalidated_before and session_start is not None:
        session_dt = datetime.now(timezone.utc)
        if session_start:
            session_dt = datetime.fromtimestamp(session_start, tz=timezone.utc)
        invalidated_dt = user.sessions_invalidated_before
        if invalidated_dt.tzinfo is None:
            invalidated_dt = invalidated_dt.replace(tzinfo=timezone.utc)
        if session_dt < invalidated_dt:
            response.delete_cookie(
                key="access_token",
                httponly=True,
                samesite="lax",
                secure=settings.secure_cookies,
            )
            
            ip = request.client.host if request.client else "unknown"
            user_agent_str = request.headers.get("user-agent", "unknown")
            try:
                from app.api.routes.auth import parse_user_agent
                browser, os, device = parse_user_agent(user_agent_str)
            except Exception:
                browser, os, device = "Unknown", "Unknown", "Unknown"
                
            from app.db.models import UserLoginHistory
            login_history = UserLoginHistory(
                user_id=user.id,
                ip_address=ip,
                result="FAILURE",
                status="FAILURE",
                reason="EXPIRED_SESSION",
                browser=browser,
                os=os,
                device=device,
                timestamp=datetime.now(timezone.utc),
            )
            db.add(login_history)
            
            # Deactivate session in DB if active
            if session_id:
                from app.db.models import UserSession
                from sqlalchemy import select
                res = await db.execute(select(UserSession).where(UserSession.id == session_id))
                user_session = res.scalar_one_or_none()
                if user_session:
                    user_session.is_active = False
                    
            await crud.log_activity(
                db,
                user_id=user.id,
                username=user.username,
                action="session_expired",
                details=f"Session invalidated by forced logout: {session_id}",
                ip_address=ip
            )
            await db.commit()
            
            logger.info("Session invalidated (force logged out) for user id=%s", user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session invalidated. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
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
