"""
Authentication routes: register, login, logout, current user.
Tokens are set as httpOnly cookies — never in localStorage.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core import security
from app.db import crud
from app.db.database import get_db
from app.db.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_NAME = "access_token"
_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Register a new user account.
    Returns a JWT set as an httpOnly cookie.
    """
    if await crud.get_user_by_username(db, body.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )
    if await crud.get_user_by_email(db, body.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    hashed = security.hash_password(body.password)
    user = await crud.create_user(db, body.username, body.email, hashed)
    now_ts = int(datetime.now(timezone.utc).timestamp())
    token = security.create_access_token({"sub": str(user.id), "session_start": now_ts})

    await crud.log_activity(
        db,
        user_id=user.id,
        username=user.username,
        action="register_success",
        details="User registered account successfully",
        ip_address=request.client.host if request.client else "unknown"
    )

    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        secure=False,  # set True behind HTTPS in production
    )
    logger.info("New user registered: %s (id=%d)", user.username, user.id)
    await db.commit()
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate with username + password.
    Returns a JWT set as an httpOnly cookie.
    """
    ip = request.client.host if request.client else "unknown"
    user = await crud.get_user_by_username(db, body.username)
    if not user or not security.verify_password(body.password, user.password_hash):
        await crud.log_activity(
            db,
            user_id=user.id if user else None,
            username=body.username,
            action="login_failure",
            details="Failed login attempt",
            ip_address=ip
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    now_ts = int(datetime.now(timezone.utc).timestamp())
    token = security.create_access_token({"sub": str(user.id), "session_start": now_ts})
    await crud.update_user_last_login(db, user.id)

    await crud.log_activity(
        db,
        user_id=user.id,
        username=user.username,
        action="login_success",
        details="User logged in successfully",
        ip_address=ip
    )

    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        secure=False,
    )
    logger.info("User logged in: %s (id=%d)", user.username, user.id)
    await db.commit()
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response) -> None:
    """Clear the authentication cookie."""
    response.delete_cookie(key=_COOKIE_NAME)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)


from app.schemas.auth import PasswordResetRequest


@router.put("/password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(
    body: PasswordResetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Reset the current user's password."""
    if not security.verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )
    
    hashed = security.hash_password(body.new_password)
    await crud.update_user_password(db, current_user.id, hashed)

    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="password_reset",
        details="User reset password successfully",
        ip_address=current_user.last_ip_address
    )

    await db.commit()
    logger.info("Password updated for user: %s (id=%d)", current_user.username, current_user.id)


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete the current user's account and clear session cookie."""
    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete_account",
        details="User self-deleted their account",
        ip_address=current_user.last_ip_address
    )
    await crud.delete_user(db, current_user.id)
    await db.commit()
    response.delete_cookie(key=_COOKIE_NAME)
    logger.info("Account deleted: %s (id=%d)", current_user.username, current_user.id)
