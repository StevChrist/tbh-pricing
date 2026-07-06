"""
Authentication routes: register, login, logout, current user,
email verification, and resend verification.

Register no longer auto-logs the user in — email verification is required first.
Tokens are set as httpOnly cookies — never in localStorage.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, login_rate_limiter, auth_rate_limiter
from app.core import security
from app.core.config import settings
from app.db import crud
from app.db.database import get_db
from app.db.models import OtpPurposeEnum, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResendResetOtpRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
    VerifyResetOtpRequest,
    RequestAccountDeletionRequest,
    DeleteAccountRequest,
    UpdateUsernameRequest,
    RequestEmailChangeRequest,
    ConfirmEmailChangeRequest,
)
from app.services.email_service import email_service
from app.services import otp_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

_COOKIE_NAME = "access_token"
_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def parse_user_agent(user_agent: str) -> tuple[str, str, str]:
    if not user_agent:
        return "Unknown", "Unknown", "Unknown"
        
    user_agent_lower = user_agent.lower()
    
    # Browser detection
    if "edg/" in user_agent_lower or "edge" in user_agent_lower:
        browser = "Edge"
    elif "opera" in user_agent_lower or "opr/" in user_agent_lower:
        browser = "Opera"
    elif "chrome" in user_agent_lower:
        browser = "Chrome"
    elif "safari" in user_agent_lower:
        browser = "Safari"
    elif "firefox" in user_agent_lower:
        browser = "Firefox"
    else:
        browser = "Unknown"
        
    # OS detection
    if "windows" in user_agent_lower:
        os_str = "Windows"
    elif "macintosh" in user_agent_lower or "mac os x" in user_agent_lower:
        os_str = "macOS"
    elif "android" in user_agent_lower:
        os_str = "Android"
    elif "iphone" in user_agent_lower or "ipad" in user_agent_lower:
        os_str = "iOS"
    elif "linux" in user_agent_lower:
        os_str = "Linux"
    else:
        os_str = "Unknown"
        
    # Device detection
    if "mobi" in user_agent_lower:
        device = "Mobile"
    elif "tablet" in user_agent_lower or "ipad" in user_agent_lower:
        device = "Tablet"
    elif "windows" in user_agent_lower or "macintosh" in user_agent_lower or "linux" in user_agent_lower:
        device = "Desktop"
    else:
        device = "Unknown"
        
    return browser, os_str, device


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(auth_rate_limiter)])
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    """
    Register a new user account.

    Creates the user with email_verified=False.
    Sends an OTP verification email.
    Does NOT return a JWT — user must verify their email before logging in.
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
    # email_verified defaults to False — no explicit set needed

    await crud.log_activity(
        db,
        user_id=user.id,
        username=user.username,
        action="register_success",
        details="User registered account successfully",
        ip_address=request.client.host if request.client else "unknown",
    )
    await db.commit()
    logger.info("New user registered: %s (id=%d)", user.username, user.id)

    # Generate and store OTP in a separate try/except so a failure does NOT
    # rollback the user account. If SMTP is unconfigured, the user can still
    # resend verification later via /auth/resend-verification.
    try:
        ctx = await otp_service.generate_and_store(db, user.id, OtpPurposeEnum.REGISTER)
        await db.commit()

        html = otp_service.render_otp_email(
            title="Verify your email",
            subtitle=(
                "Welcome to TBH Price Tracker! "
                "Use the code below to verify your email address."
            ),
            otp=ctx.otp,
            footer="© TBH Price Tracker — Do not share this code with anyone.",
        )
        email_service.send_html(
            user.email,
            "Verify your TBH Price Tracker email",
            html,
        )
        logger.info("Verification email sent to user_id=%d", user.id)
    except RuntimeError as exc:
        # SMTP not configured — account is still created, user can resend later
        logger.warning(
            "Could not send verification email for user_id=%d (SMTP not configured): %s. "
            "[DEVELOPMENT WORKAROUND] Plaintext OTP: %s",
            user.id,
            exc,
            ctx.otp,
        )
    except Exception as exc:
        logger.error(
            "Unexpected error sending verification email for user_id=%d: %s",
            user.id,
            exc,
        )

    # Partially mask email: "user@example.com" → "u***@example.com"
    local, _, domain = user.email.partition("@")
    masked_email = f"{local[0]}***@{domain}"

    return RegisterResponse(
        message=(
            "Account created successfully. "
            "Please check your email for a verification code."
        ),
        email=masked_email,
    )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(login_rate_limiter)])
async def login(
    body: LoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate with username + password.
    Returns a JWT set as an httpOnly cookie.
    Rejects unverified accounts with HTTP 403.
    """
    ip = request.client.host if request.client else "unknown"
    user_agent_str = request.headers.get("user-agent", "unknown")
    browser, os, device = parse_user_agent(user_agent_str)
    
    user = await crud.get_user_by_username(db, body.username)
    
    # 1. Lockout Protection Check
    now_dt = datetime.now(timezone.utc)
    if user and user.locked_until:
        locked_until = user.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now_dt:
            remaining_mins = int((locked_until - now_dt).total_seconds() / 60) + 1
            
            # Log lockout attempt
            from app.db.models import UserLoginHistory
            login_history = UserLoginHistory(
                user_id=user.id,
                ip_address=ip,
                result="FAILURE",
                status="FAILURE",
                reason="LOCKED_OUT",
                browser=browser,
                os=os,
                device=device,
                timestamp=datetime.now(timezone.utc),
            )
            db.add(login_history)
            await db.commit()
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is temporarily locked due to 5 failed login attempts. Try again in {remaining_mins} minutes.",
            )

    # 2. Verify Password and handle failed attempt increments
    if not user or not security.verify_password(body.password, user.password_hash):
        if user:
            user.failed_login_attempts += 1
            reason = "INVALID_PASSWORD"
            
            from datetime import timedelta
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
                # Log Lockout event
                await crud.log_activity(
                    db,
                    user_id=user.id,
                    username=user.username,
                    action="lockout",
                    details="Account locked due to 5 failed login attempts",
                    ip_address=ip,
                )
                await crud.log_security_event(
                    db,
                    user_id=user.id,
                    severity="WARNING",
                    ip_address=ip,
                    description="Account locked out for 15 minutes due to 5 failed login attempts"
                )
                
            from app.db.models import UserLoginHistory
            login_history = UserLoginHistory(
                user_id=user.id,
                ip_address=ip,
                result="FAILURE",
                status="FAILURE",
                reason=reason,
                browser=browser,
                os=os,
                device=device,
                timestamp=datetime.now(timezone.utc),
            )
            db.add(login_history)
            await crud.log_activity(
                db,
                user_id=user.id,
                username=user.username,
                action="login_failure",
                details="Failed login attempt: invalid password",
                ip_address=ip,
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="wrong password",
            )
        else:
            from app.db.models import UserLoginHistory
            login_history = UserLoginHistory(
                user_id=None,
                ip_address=ip,
                result="FAILURE",
                status="FAILURE",
                reason="UNKNOWN_USER",
                browser=browser,
                os=os,
                device=device,
                timestamp=datetime.now(timezone.utc),
            )
            db.add(login_history)
            await crud.log_activity(
                db,
                user_id=None,
                username=body.username,
                action="login_failure",
                details=f"Failed login attempt for non-existent user: {body.username}",
                ip_address=ip,
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="wrong username",
            )

    # 3. Block login if user is suspended or banned
    if user.status == "SUSPENDED":
        from app.db.models import UserLoginHistory
        login_history = UserLoginHistory(
            user_id=user.id,
            ip_address=ip,
            result="FAILURE",
            status="FAILURE",
            reason="SUSPENDED_USER",
            browser=browser,
            os=os,
            device=device,
            timestamp=datetime.now(timezone.utc),
        )
        db.add(login_history)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact the administrator.",
        )
        
    if user.status == "BANNED":
        from app.db.models import UserLoginHistory
        login_history = UserLoginHistory(
            user_id=user.id,
            ip_address=ip,
            result="FAILURE",
            status="FAILURE",
            reason="BANNED_USER",
            browser=browser,
            os=os,
            device=device,
            timestamp=datetime.now(timezone.utc),
        )
        db.add(login_history)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been permanently banned.",
        )

    # Block login if email not yet verified
    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in.",
        )

    # 4. Successful login setup
    user.failed_login_attempts = 0
    user.locked_until = None

    import uuid
    session_id = str(uuid.uuid4())

    # Check for new browser/device/IP
    from sqlalchemy import select, and_
    from app.db.models import UserLoginHistory, UserSession
    
    stmt = select(UserLoginHistory).where(
        and_(
            UserLoginHistory.user_id == user.id,
            UserLoginHistory.result == "SUCCESS"
        )
    )
    res_history = await db.execute(stmt)
    past_successes = res_history.scalars().all()
    
    is_new_ip = True
    is_new_browser = True
    is_new_device = True
    
    for h in past_successes:
        if h.ip_address == ip:
            is_new_ip = False
        if h.browser == browser:
            is_new_browser = False
        if h.device == device:
            is_new_device = False

    # Add active session
    user_session = UserSession(
        id=session_id,
        user_id=user.id,
        ip_address=ip,
        browser=browser,
        os=os,
        device=device,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        last_activity_at=datetime.now(timezone.utc)
    )
    db.add(user_session)

    # Log successful login to UserLoginHistory
    login_history = UserLoginHistory(
        user_id=user.id,
        ip_address=ip,
        result="SUCCESS",
        status="SUCCESS",
        browser=browser,
        os=os,
        device=device,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(login_history)

    await crud.update_user_last_login(db, user.id)
    await crud.log_activity(
        db,
        user_id=user.id,
        username=user.username,
        action="session_created",
        details=f"Session created: {session_id}",
        ip_address=ip,
    )

    # Send email notification if login parameters are new
    if past_successes and (is_new_ip or is_new_browser or is_new_device):
        try:
            email_html = f"""
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #06b6d4;">New Login Detected</h2>
              <p>Hello @{user.username},</p>
              <p>We detected a login to your account from a new browser, device, or IP address:</p>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 12px; font-weight: bold; width: 150px; border-bottom: 1px solid #e2e8f0;">IP Address:</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">{ip}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Browser:</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">{browser}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">Operating System:</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">{os}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; font-weight: bold;">Device Type:</td>
                  <td style="padding: 12px;">{device}</td>
                </tr>
              </table>
              <p>If this was you, you can safely ignore this email.</p>
              <p style="color: #ef4444; font-weight: bold;">If this was not you, please log in and terminate this session or reset your password immediately.</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 0.8rem; color: #666;">© TBH Price Tracker</p>
            </div>
            """
            email_service.send_html(
                user.email,
                "New Login Alert - TBH Price Tracker",
                email_html
            )
        except RuntimeError as exc:
            logger.warning(
                "Could not send login alert email to %s (SMTP not configured): %s",
                user.email, exc
            )
        except Exception as exc:
            logger.error("Unexpected error sending new login alert email: %s", exc)

    now_ts = int(datetime.now(timezone.utc).timestamp())
    token = security.create_access_token({"sub": str(user.id), "session_start": now_ts, "session_id": session_id})

    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        secure=settings.secure_cookies,
    )
    logger.info("User logged in: %s (id=%d)", user.username, user.id)
    await db.commit()
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Clear the authentication cookie and terminate the session in the DB."""
    # Retrieve cookie to find session ID
    access_token = request.cookies.get(_COOKIE_NAME)
    ip = request.client.host if request.client else "unknown"
    if access_token:
        payload = security.decode_access_token(access_token)
        if payload:
            session_id = payload.get("session_id")
            if session_id:
                from app.db.models import UserSession
                from sqlalchemy import select
                res = await db.execute(select(UserSession).where(UserSession.id == session_id))
                user_session = res.scalar_one_or_none()
                if user_session:
                    user_session.is_active = False
                    
                # Audit logs
                await crud.log_activity(
                    db,
                    user_id=current_user.id,
                    username=current_user.username,
                    action="session_removed",
                    details=f"Session removed: {session_id}",
                    ip_address=ip
                )
                
                # Write to security events
                await crud.log_security_event(
                    db,
                    user_id=current_user.id,
                    severity="INFO",
                    ip_address=ip,
                    description=f"User logged out, terminating session {session_id}"
                )

    # Record to login history
    user_agent_str = request.headers.get("user-agent", "unknown")
    browser, os, device = parse_user_agent(user_agent_str)
    
    from app.db.models import UserLoginHistory
    login_history = UserLoginHistory(
        user_id=current_user.id,
        ip_address=ip,
        result="SUCCESS",
        status="LOGOUT",
        browser=browser,
        os=os,
        device=device,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(login_history)
    await db.commit()

    response.delete_cookie(
        key=_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
    )


# ---------------------------------------------------------------------------
# Current user
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return the currently authenticated user's profile."""
    return UserResponse.model_validate(current_user)


# ---------------------------------------------------------------------------
# Verify email
# ---------------------------------------------------------------------------


@router.post("/verify-email", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Verify a user's email address using a 6-digit OTP.

    Returns 409 if the email is already verified.
    Returns 400 if the OTP is invalid or expired.
    Returns 429 if max verification attempts are exceeded.
    """
    user = await crud.get_user_by_email(db, body.email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    if user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address has already been verified.",
        )

    # otp_service.verify() raises 400 (no active OTP) or 429 (max attempts)
    try:
        verified = await otp_service.verify(
            db, user.id, OtpPurposeEnum.REGISTER, body.otp
        )
    except HTTPException:
        await db.commit()  # persist incremented attempt counter
        raise

    if not verified:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    await crud.set_user_email_verified(db, user.id)
    await crud.log_activity(
        db,
        user_id=user.id,
        username=user.username,
        action="email_verified",
        details="User verified email address via OTP",
    )
    await db.commit()
    logger.info("Email verified for user_id=%d", user.id)
    return MessageResponse(message="Email verified successfully. You can now log in.")


# ---------------------------------------------------------------------------
# Resend verification
# ---------------------------------------------------------------------------


@router.post("/resend-verification", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def resend_verification(
    body: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Resend an OTP verification email.

    Always returns the same generic message to prevent email enumeration.
    Propagates HTTP 429 if resend cooldown or max-resend limit is exceeded.
    """
    _GENERIC_MSG = (
        "If the account exists and is unverified, "
        "a new verification code has been sent."
    )

    user = await crud.get_user_by_email(db, body.email)

    # Silently return the generic message if account doesn't exist or is already verified
    if user is None or user.email_verified:
        return MessageResponse(message=_GENERIC_MSG)

    try:
        ctx = await otp_service.resend(db, user.id, OtpPurposeEnum.REGISTER)
        await db.commit()

        html = otp_service.render_otp_email(
            title="Verify your email",
            subtitle="Here is your new verification code for TBH Price Tracker.",
            otp=ctx.otp,
            footer="© TBH Price Tracker — Do not share this code with anyone.",
        )
        email_service.send_html(
            user.email,
            "Verify your TBH Price Tracker email",
            html,
        )
        logger.info("Verification email resent to user_id=%d", user.id)
    except HTTPException:
        # Propagate 429 (rate limit / cooldown) from otp_service
        await db.commit()
        raise
    except RuntimeError as exc:
        # SMTP not configured
        logger.warning(
            "Could not resend verification email for user_id=%d: %s. "
            "[DEVELOPMENT WORKAROUND] Plaintext OTP: %s",
            user.id,
            exc,
            ctx.otp,
        )
    except Exception as exc:
        logger.error(
            "Unexpected error resending verification email for user_id=%d: %s",
            user.id,
            exc,
        )

    return MessageResponse(message=_GENERIC_MSG)


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------


from app.schemas.auth import PasswordResetRequest  # noqa: E402


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
        ip_address=current_user.last_ip_address,
    )

    await db.commit()
    logger.info("Password updated for user: %s (id=%d)", current_user.username, current_user.id)


# ---------------------------------------------------------------------------
# Delete account
# ---------------------------------------------------------------------------


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
        ip_address=current_user.last_ip_address,
    )
    await crud.delete_user(db, current_user.id)
    await db.commit()
    response.delete_cookie(
        key=_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
    )
    logger.info("Account deleted: %s (id=%d)", current_user.username, current_user.id)


# ---------------------------------------------------------------------------
# Forgot password — request reset code
# ---------------------------------------------------------------------------

_FORGOT_MSG = (
    "If the account exists, a password reset code has been sent to the email address."
)


@router.post("/forgot-password", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Request a password reset OTP.

    Always returns the same generic message to prevent email enumeration.
    The OTP email is sent only when the account exists.
    """
    user = await crud.get_user_by_email(db, body.email)

    if user is not None:
        try:
            ctx = await otp_service.generate_and_store(
                db, user.id, OtpPurposeEnum.RESET_PASSWORD
            )
            await db.commit()

            html = otp_service.render_otp_email(
                title="Reset your password",
                subtitle=(
                    "We received a request to reset your TBH Price Tracker password. "
                    "Use the code below to continue."
                ),
                otp=ctx.otp,
                footer=(
                    "© TBH Price Tracker — If you did not request this, "
                    "you can safely ignore this email."
                ),
            )
            email_service.send_html(
                user.email,
                "Reset your TBH Price Tracker password",
                html,
            )
            logger.info("Password reset email sent to user_id=%d", user.id)
        except RuntimeError as exc:
            logger.warning(
                "Could not send reset email for user_id=%d (SMTP not configured): %s. "
                "[DEVELOPMENT WORKAROUND] Plaintext OTP: %s",
                user.id, exc, ctx.otp
            )
        except Exception as exc:
            logger.error(
                "Unexpected error sending reset email for user_id=%d: %s",
                user.id, exc,
            )

    return MessageResponse(message=_FORGOT_MSG)


# ---------------------------------------------------------------------------
# Forgot password — verify reset OTP (without changing password yet)
# ---------------------------------------------------------------------------


@router.post("/verify-reset-otp", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def verify_reset_otp(
    body: VerifyResetOtpRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Verify the password reset OTP without changing the password.

    Use this step to confirm the OTP is valid before asking the user
    to type a new password. The OTP remains active after this call.
    """
    user = await crud.get_user_by_email(db, body.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )

    # Peek at the OTP without consuming it
    from app.repositories import otp_repository
    record = await otp_repository.get_active_otp(
        db, user.id, OtpPurposeEnum.RESET_PASSWORD
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )
    if record.attempts >= settings.otp_max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Maximum verification attempts ({settings.otp_max_attempts}) exceeded. "
                "Please request a new reset code."
            ),
        )

    from app.core.otp_hashing import verify_otp as _verify_otp
    if not _verify_otp(body.otp, record.otp_hash):
        await otp_repository.increment_attempt(db, record)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )

    # OTP is valid — do NOT mark as used yet (password change happens next)
    await db.commit()
    return MessageResponse(message="Reset code verified. You may now set a new password.")


# ---------------------------------------------------------------------------
# Forgot password — reset password (verify OTP + set new password atomically)
# ---------------------------------------------------------------------------


@router.post("/reset-password", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def reset_password_via_otp(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Verify the reset OTP and update the user's password atomically.

    The OTP is marked used immediately on success so it cannot be replayed.
    """
    user = await crud.get_user_by_email(db, body.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )

    # verify() marks the OTP as used on success and raises 400/429 on failure
    try:
        verified = await otp_service.verify(
            db, user.id, OtpPurposeEnum.RESET_PASSWORD, body.otp
        )
    except HTTPException:
        await db.commit()
        raise

    if not verified:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )

    # Hash and update password
    new_hash = security.hash_password(body.new_password)
    await crud.update_user_password(db, user.id, new_hash)
    await crud.log_activity(
        db,
        user_id=user.id,
        username=user.username,
        action="password_reset_via_otp",
        details="User reset password via forgot-password OTP flow",
    )
    await db.commit()
    logger.info("Password reset via OTP for user_id=%d", user.id)
    return MessageResponse(message="Password updated successfully. You can now log in.")


# ---------------------------------------------------------------------------
# Forgot password — resend reset OTP
# ---------------------------------------------------------------------------


@router.post("/resend-reset-otp", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def resend_reset_otp(
    body: ResendResetOtpRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Resend the password reset OTP.

    Always returns the same generic message to prevent email enumeration.
    Propagates HTTP 429 when cooldown or max-resend limit is exceeded.
    """
    user = await crud.get_user_by_email(db, body.email)

    if user is None:
        return MessageResponse(message=_FORGOT_MSG)

    try:
        ctx = await otp_service.resend(db, user.id, OtpPurposeEnum.RESET_PASSWORD)
        await db.commit()

        html = otp_service.render_otp_email(
            title="Reset your password",
            subtitle="Here is your new password reset code for TBH Price Tracker.",
            otp=ctx.otp,
            footer=(
                "© TBH Price Tracker — If you did not request this, "
                "you can safely ignore this email."
            ),
        )
        email_service.send_html(
            user.email,
            "Reset your TBH Price Tracker password",
            html,
        )
        logger.info("Password reset email resent to user_id=%d", user.id)
    except HTTPException:
        await db.commit()
        raise
    except RuntimeError as exc:
        logger.warning(
            "Could not resend reset email for user_id=%d: %s. "
            "[DEVELOPMENT WORKAROUND] Plaintext OTP: %s",
            user.id, exc, ctx.otp
        )
    except Exception as exc:
        logger.error(
            "Unexpected error resending reset email for user_id=%d: %s",
            user.id, exc,
        )

    return MessageResponse(message=_FORGOT_MSG)


# ---------------------------------------------------------------------------
# Delete Account — verification & permanent deletion
# ---------------------------------------------------------------------------


@router.post("/request-account-deletion", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def request_account_deletion(
    body: RequestAccountDeletionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Verify password and request email OTP to delete account.
    """
    if not security.verify_password(body.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password.",
        )

    try:
        ctx = await otp_service.generate_and_store(
            db, current_user.id, OtpPurposeEnum.DELETE_ACCOUNT
        )
        await db.commit()

        # Render and send email
        html = otp_service.render_otp_email(
            title="Confirm Account Deletion",
            subtitle=(
                "We received a request to permanently delete your TBH Price Tracker account. "
                "WARNING: Deleting your account will permanently remove all your settings, "
                "inventory items, notifications, and price alerts. This action CANNOT be undone."
            ),
            otp=ctx.otp,
            footer="© TBH Price Tracker — If you did not request this, please change your password immediately.",
        )
        email_service.send_html(
            current_user.email,
            "Confirm Account Deletion",
            html,
        )
        logger.info("Account deletion verification email sent to user_id=%d", current_user.id)
    except RuntimeError as exc:
        logger.warning(
            "Could not send deletion verification email for user_id=%d: %s. "
            "[DEVELOPMENT WORKAROUND] Plaintext OTP: %s",
            current_user.id, exc, ctx.otp
        )
    except Exception as exc:
        logger.error(
            "Unexpected error sending deletion email for user_id=%d: %s",
            current_user.id, exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email.",
        )

    return MessageResponse(message="Verification code sent to your email.")


@router.post("/delete-account", dependencies=[Depends(auth_rate_limiter)])
async def delete_account_via_otp(
    body: DeleteAccountRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Verify OTP for DELETE_ACCOUNT purpose and permanently delete the user's account.
    Clears JWT cookie and logs out user immediately.
    """
    try:
        verified = await otp_service.verify(
            db, current_user.id, OtpPurposeEnum.DELETE_ACCOUNT, body.otp
        )
    except HTTPException:
        await db.commit()
        raise

    if not verified:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
        )

    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete_account_via_otp",
        details="User permanently deleted account via password + OTP verification",
    )
    
    await crud.delete_user(db, current_user.id)
    await db.commit()

    # Clear auth cookie
    response.delete_cookie(
        key=_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
    )
    logger.info("Account permanently deleted via OTP: %s (id=%d)", current_user.username, current_user.id)

    return MessageResponse(message="Account deleted successfully.")


@router.post("/resend-delete-otp", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def resend_delete_otp(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Resend OTP for DELETE_ACCOUNT purpose.
    """
    try:
        ctx = await otp_service.resend(
            db, current_user.id, OtpPurposeEnum.DELETE_ACCOUNT
        )
        await db.commit()

        html = otp_service.render_otp_email(
            title="Confirm Account Deletion",
            subtitle="Here is your new verification code to permanently delete your TBH Price Tracker account.",
            otp=ctx.otp,
            footer="© TBH Price Tracker — If you did not request this, please change your password immediately.",
        )
        email_service.send_html(
            current_user.email,
            "Confirm Account Deletion",
            html,
        )
        logger.info("Account deletion verification email resent to user_id=%d", current_user.id)
    except HTTPException:
        await db.commit()
        raise
    except RuntimeError as exc:
        logger.warning(
            "Could not resend delete email for user_id=%d: %s. "
            "[DEVELOPMENT WORKAROUND] Plaintext OTP: %s",
            current_user.id, exc, ctx.otp
        )
    except Exception as exc:
        logger.error(
            "Unexpected error resending delete email for user_id=%d: %s",
            current_user.id, exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email.",
        )

    return MessageResponse(message="Verification code sent to your email.")


# ---------------------------------------------------------------------------
# Edit profile — change username (max 1 time after registration)
# ---------------------------------------------------------------------------


@router.put("/username", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def change_username(
    body: UpdateUsernameRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Change the current user's username.
    Allowed 1 time after creation (register counts as the first username).
    """
    if current_user.username_changes_count >= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only change your username 1 time after registration.",
        )

    # Check if new username is already taken
    existing = await crud.get_user_by_username(db, body.new_username)
    if existing and existing.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken.",
        )

    old_username = current_user.username
    current_user.username = body.new_username
    current_user.username_changes_count += 1

    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="change_username",
        details=f"User changed username from {old_username} to {body.new_username}",
    )
    await db.commit()
    logger.info("User id=%d changed username to %s", current_user.id, body.new_username)

    return MessageResponse(message="Username updated successfully.")


# ---------------------------------------------------------------------------
# Edit profile — change email (max once per 30 days, verified via OTP)
# ---------------------------------------------------------------------------


@router.post("/request-email-change", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def request_email_change(
    body: RequestEmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Request changing the user's email.
    Can be done at most once every 30 days. Sends an OTP code to the new email.
    """
    # 30-day time constraint check
    if current_user.last_email_changed_at:
        now = datetime.now(timezone.utc)
        last_changed = current_user.last_email_changed_at.replace(tzinfo=timezone.utc) if current_user.last_email_changed_at.tzinfo is None else current_user.last_email_changed_at
        diff = now - last_changed
        if diff.days < 30:
            days_left = 30 - diff.days
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only change your email once every 30 days. Please wait {days_left} more day(s).",
            )

    # Check if new email is already registered
    existing = await crud.get_user_by_email(db, body.new_email)
    if existing and existing.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered by another account.",
        )

    try:
        ctx = await otp_service.generate_and_store(
            db, current_user.id, OtpPurposeEnum.CHANGE_EMAIL
        )
        await db.commit()

        # Render and send email to the NEW email address
        html = otp_service.render_otp_email(
            title="Confirm Email Change",
            subtitle=(
                "We received a request to change your TBH Price Tracker email to this address. "
                "Use the verification code below to confirm this change."
            ),
            otp=ctx.otp,
            footer="© TBH Price Tracker — If you did not request this, you can safely ignore this email.",
        )
        email_service.send_html(
            body.new_email,
            "Confirm Email Change - TBH Price Tracker",
            html,
        )
        logger.info("Email change OTP sent to %s for user_id=%d", body.new_email, current_user.id)
    except RuntimeError as exc:
        logger.warning(
            "Could not send email change verification to %s (SMTP not configured): %s. "
            "[DEVELOPMENT WORKAROUND] Plaintext OTP: %s",
            body.new_email, exc, ctx.otp
        )
    except Exception as exc:
        logger.error(
            "Unexpected error sending email change OTP: %s", exc
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification email.",
        )

    return MessageResponse(message="Verification code sent to your new email.")


@router.post("/change-email", response_model=MessageResponse, dependencies=[Depends(auth_rate_limiter)])
async def change_email_via_otp(
    body: ConfirmEmailChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """
    Confirm email change using the OTP code sent to the new email.
    """
    # 30-day time constraint check
    if current_user.last_email_changed_at:
        now = datetime.now(timezone.utc)
        last_changed = current_user.last_email_changed_at.replace(tzinfo=timezone.utc) if current_user.last_email_changed_at.tzinfo is None else current_user.last_email_changed_at
        diff = now - last_changed
        if diff.days < 30:
            days_left = 30 - diff.days
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"You can only change your email once every 30 days. Please wait {days_left} more day(s).",
            )

    # Check if new email is already registered
    existing = await crud.get_user_by_email(db, body.new_email)
    if existing and existing.id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered by another account.",
        )

    try:
        verified = await otp_service.verify(
            db, current_user.id, OtpPurposeEnum.CHANGE_EMAIL, body.otp
        )
    except HTTPException:
        await db.commit()
        raise

    if not verified:
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code.",
        )

    old_email = current_user.email
    current_user.email = body.new_email
    current_user.last_email_changed_at = datetime.now(timezone.utc)

    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="change_email",
        details=f"User changed email from {old_email} to {body.new_email}",
    )
    await db.commit()
    logger.info("User id=%d changed email to %s", current_user.id, body.new_email)

    return MessageResponse(message="Email updated successfully.")


@router.get("/sessions", response_model=list[dict])
async def get_user_sessions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """Retrieve all active sessions for the current user."""
    from app.db.models import UserSession
    from sqlalchemy import select, desc
    stmt = select(UserSession).where(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True
    ).order_by(desc(UserSession.created_at))
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    
    access_token = request.cookies.get(_COOKIE_NAME)
    current_session_id = None
    if access_token:
        payload = security.decode_access_token(access_token)
        if payload:
            current_session_id = payload.get("session_id")
            
    return [
        {
            "id": s.id,
            "created_at": s.created_at,
            "last_activity_at": s.last_activity_at,
            "ip_address": s.ip_address,
            "browser": s.browser,
            "os": s.os,
            "device": s.device,
            "is_current": s.id == current_session_id,
        }
        for s in sessions
    ]


@router.post("/sessions/{session_id}/terminate", response_model=MessageResponse)
async def terminate_user_session(
    session_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Terminate a specific active session belonging to the current user."""
    from app.db.models import UserSession
    from sqlalchemy import select
    res = await db.execute(select(UserSession).where(UserSession.id == session_id))
    user_session = res.scalar_one_or_none()
    if not user_session or user_session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    user_session.is_active = False
    
    ip = request.client.host if request.client else "unknown"
    # Audit Log
    await crud.log_activity(
        db,
        user_id=current_user.id,
        username=current_user.username,
        action="session_revoked",
        details=f"Session revoked by user: {session_id}",
        ip_address=ip
    )
    
    # Security Event
    await crud.log_security_event(
        db,
        user_id=current_user.id,
        severity="INFO",
        ip_address=ip,
        description=f"User terminated session {session_id}"
    )
    await db.commit()
    return MessageResponse(message="Session terminated successfully.")


@router.post("/sessions/terminate-others", response_model=MessageResponse)
async def terminate_other_sessions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """Terminate all active sessions for the current user except the current one."""
    access_token = request.cookies.get(_COOKIE_NAME)
    current_session_id = None
    if access_token:
        payload = security.decode_access_token(access_token)
        if payload:
            current_session_id = payload.get("session_id")
            
    from app.db.models import UserSession
    from sqlalchemy import select, and_
    stmt = select(UserSession).where(
        and_(
            UserSession.user_id == current_user.id,
            UserSession.is_active == True,
            UserSession.id != current_session_id
        )
    )
    res = await db.execute(stmt)
    other_sessions = res.scalars().all()
    
    for s in other_sessions:
        s.is_active = False
        
    ip = request.client.host if request.client else "unknown"
    if other_sessions:
        # Audit Log
        await crud.log_activity(
            db,
            user_id=current_user.id,
            username=current_user.username,
            action="session_revoked",
            details=f"Terminated {len(other_sessions)} other sessions",
            ip_address=ip
        )
        
        # Security Event
        await crud.log_security_event(
            db,
            user_id=current_user.id,
            severity="INFO",
            ip_address=ip,
            description=f"User terminated {len(other_sessions)} other sessions"
        )
        
    await db.commit()
    return MessageResponse(message=f"Successfully terminated {len(other_sessions)} other sessions.")


@router.get("/login-history", response_model=list[dict])
async def get_user_login_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """Retrieve recent login attempts for the current user."""
    from app.db.models import UserLoginHistory
    from sqlalchemy import select, desc
    stmt = select(UserLoginHistory).where(UserLoginHistory.user_id == current_user.id).order_by(desc(UserLoginHistory.timestamp)).limit(50)
    res = await db.execute(stmt)
    histories = res.scalars().all()
    return [
        {
            "id": h.id,
            "timestamp": h.timestamp,
            "ip_address": h.ip_address,
            "result": h.result,
            "status": h.status,
            "reason": h.reason,
            "browser": h.browser,
            "os": h.os,
            "device": h.device,
        }
        for h in histories
    ]


@router.get("/security-events", response_model=list[dict])
async def get_user_security_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """Retrieve recent security events for the current user."""
    from app.db.models import SecurityEvent
    from sqlalchemy import select, desc
    stmt = select(SecurityEvent).where(SecurityEvent.user_id == current_user.id).order_by(desc(SecurityEvent.timestamp)).limit(50)
    res = await db.execute(stmt)
    events = res.scalars().all()
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp,
            "severity": e.severity,
            "ip_address": e.ip_address,
            "description": e.description,
        }
        for e in events
    ]

