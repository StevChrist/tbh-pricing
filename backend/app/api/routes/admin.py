from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_

from app.api.deps import get_current_user
from app.db import crud
from app.db.database import get_db
from app.db.models import User, InventoryItem, ActivityLog, UserLoginHistory, OtpPurposeEnum
from app.services.email_service import email_service
from app.services import otp_service
from app.schemas.auth import MessageResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


class AdminStatsResponse(BaseModel):
    total_users: int
    verified_users: int
    admins: int
    suspended_users: int
    banned_users: int
    active_today: int


class LoginHistoryResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    timestamp: datetime
    ip_address: str
    result: str
    browser: str | None = None
    device: str | None = None


# Schemas
class AdminNotifyRequest(BaseModel):
    notify_type: Literal["alert", "message", "notification"]
    message: str = Field(..., min_length=1, max_length=512)


class AdminUserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    username: str
    email: str
    role: str
    is_active: bool
    status: str
    email_verified: bool
    created_at: datetime
    last_login_at: datetime | None = None
    last_active_at: datetime | None = None
    last_ip_address: str | None = None
    daily_active_seconds: int
    inventory_count: int


class LogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int | None = None
    username: str | None = None
    action: str
    details: str | None = None
    ip_address: str | None = None
    created_at: datetime


class LogsResponse(BaseModel):
    logs: list[LogResponse]
    total: int
    limit: int
    offset: int


class UserDetailResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    status: str
    email_verified: bool
    created_at: datetime
    last_login_at: datetime | None = None
    last_active_at: datetime | None = None
    last_ip_address: str | None = None
    daily_active_seconds: int
    inventory_count: int
    total_login_count: int
    recent_activities: list[LogResponse]
    login_history: list[LoginHistoryResponse]


# Helper to check admin role
def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access required",
        )
    return current_user


@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[dict]:
    """Retrieve all users with metadata and item counts (Admin only)."""
    users_data = await crud.get_all_users_admin(db)
    return users_data


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> None:
    """Delete a user account (Admin only)."""
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot delete their own account",
        )
    
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.role == "admin":
        admins_result = await db.execute(select(func.count(User.id)).where(User.role == "admin"))
        total_admins = admins_result.scalar() or 0
        if total_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete the final administrator.",
            )

    username = user.username
    await crud.delete_user(db, user_id)

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="delete_user",
        details=f"Admin deleted user account: {username} (ID: {user_id})",
        ip_address=admin.last_ip_address
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="WARNING",
        ip_address=admin.last_ip_address,
        description=f"Admin deleted user account: {username} (ID: {user_id})"
    )
    await db.commit()
    logger.info("Admin %s deleted user %s (id=%d)", admin.username, username, user_id)


@router.post("/users/{user_id}/notify", status_code=status.HTTP_201_CREATED)
async def notify_user(
    user_id: int,
    body: AdminNotifyRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Send a custom message/alert/notification to a user (Admin only)."""
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    await crud.create_admin_notification(
        db,
        user_id=user_id,
        message=body.message,
        notify_type=body.notify_type,
    )

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="send_notification",
        details=f"Admin sent {body.notify_type} notice to user {user.username}: '{body.message}'",
        ip_address=admin.last_ip_address
    )
    await db.commit()
    return {"status": "success", "message": "Notification queued successfully"}


@router.get("/logs", response_model=LogsResponse)
async def list_logs(
    username: str | None = Query(default=None),
    action: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> LogsResponse:
    """Retrieve website activity logs with filters and pagination (Admin only)."""
    logs = await crud.get_activity_logs(db, username=username, action=action, limit=limit, offset=offset)
    total = await crud.count_activity_logs(db, username=username, action=action)
    
    return LogsResponse(
        logs=logs,
        total=total,
        limit=limit,
        offset=offset,
    )


# ---------------------------------------------------------------------------
# Statistics Cards
# ---------------------------------------------------------------------------


@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AdminStatsResponse:
    """Retrieve user statistics summaries for dashboard stats cards."""
    # 1. Total users
    tot_res = await db.execute(select(func.count(User.id)))
    total_users = tot_res.scalar() or 0

    # 2. Verified users
    ver_res = await db.execute(select(func.count(User.id)).where(User.email_verified == True))
    verified_users = ver_res.scalar() or 0

    # 3. Admins
    adm_res = await db.execute(select(func.count(User.id)).where(User.role == "admin"))
    admins = adm_res.scalar() or 0

    # 4. Suspended users
    susp_res = await db.execute(select(func.count(User.id)).where(User.status == "SUSPENDED"))
    suspended_users = susp_res.scalar() or 0

    # 5. Banned users
    ban_res = await db.execute(select(func.count(User.id)).where(User.status == "BANNED"))
    banned_users = ban_res.scalar() or 0

    # 6. Users active today
    # User is active today if last_active_at was within last 24 hours
    twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    act_res = await db.execute(
        select(func.count(User.id)).where(User.last_active_at >= twenty_four_hours_ago)
    )
    active_today = act_res.scalar() or 0

    return AdminStatsResponse(
        total_users=total_users,
        verified_users=verified_users,
        admins=admins,
        suspended_users=suspended_users,
        banned_users=banned_users,
        active_today=active_today,
    )


# ---------------------------------------------------------------------------
# User Details & Lazy-Loaded Metadata
# ---------------------------------------------------------------------------


@router.get("/users/{user_id}/detail", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> UserDetailResponse:
    """Retrieve detailed metadata, activity logs, and login histories for a user."""
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # 1. Count inventory items
    count_res = await db.execute(
        select(func.count(InventoryItem.id)).where(InventoryItem.user_id == user_id)
    )
    inventory_count = count_res.scalar() or 0

    # 2. Count total successful logins
    login_count_res = await db.execute(
        select(func.count(UserLoginHistory.id)).where(
            UserLoginHistory.user_id == user_id,
            UserLoginHistory.result == "SUCCESS"
        )
    )
    total_login_count = login_count_res.scalar() or 0

    # 3. Retrieve recent activities (latest 10 entries)
    activity_res = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user_id)
        .order_by(desc(ActivityLog.created_at))
        .limit(10)
    )
    recent_activities = activity_res.scalars().all()

    # 4. Retrieve recent login histories (latest 20 entries)
    history_res = await db.execute(
        select(UserLoginHistory)
        .where(UserLoginHistory.user_id == user_id)
        .order_by(desc(UserLoginHistory.timestamp))
        .limit(20)
    )
    login_history = history_res.scalars().all()

    return UserDetailResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        status=user.status,
        email_verified=user.email_verified,
        created_at=user.created_at,
        last_login_at=user.last_login_at,
        last_active_at=user.last_active_at,
        last_ip_address=user.last_ip_address,
        daily_active_seconds=user.daily_active_seconds,
        inventory_count=inventory_count,
        total_login_count=total_login_count,
        recent_activities=recent_activities,
        login_history=login_history,
    )


# ---------------------------------------------------------------------------
# Admin Management Actions (Suspend, Unsuspend, Ban, Unban, Force reset/logout)
# ---------------------------------------------------------------------------


@router.post("/users/{user_id}/suspend", response_model=MessageResponse)
async def suspend_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> MessageResponse:
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot suspend your own account.",
        )

    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.role == "admin":
        # Final active admin protection check
        active_admins_res = await db.execute(
            select(func.count(User.id)).where(User.role == "admin", User.status == "ACTIVE")
        )
        active_admins = active_admins_res.scalar() or 0
        if user.status == "ACTIVE" and active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot suspend the final active administrator.",
            )

    user.status = "SUSPENDED"
    # Auto force logout active sessions
    user.sessions_invalidated_before = datetime.now(timezone.utc)
    
    # Deactivate active sessions in DB
    from app.db.models import UserSession
    from sqlalchemy import update
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id)
        .values(is_active=False)
    )

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="suspend_user",
        details=f"Admin suspended user: {user.username} (ID: {user_id})",
        ip_address=admin.last_ip_address,
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="WARNING",
        ip_address=admin.last_ip_address,
        description=f"Admin suspended user: {user.username} (ID: {user_id})"
    )
    await db.commit()
    logger.info("Admin %s suspended user %s", admin.username, user.username)
    return MessageResponse(message=f"User {user.username} successfully suspended.")


@router.post("/users/{user_id}/unsuspend", response_model=MessageResponse)
async def unsuspend_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> MessageResponse:
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.status != "SUSPENDED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not currently suspended.",
        )

    user.status = "ACTIVE"

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="unsuspend_user",
        details=f"Admin unsuspended user: {user.username} (ID: {user_id})",
        ip_address=admin.last_ip_address,
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="INFO",
        ip_address=admin.last_ip_address,
        description=f"Admin unsuspended user: {user.username} (ID: {user_id})"
    )
    await db.commit()
    logger.info("Admin %s unsuspended user %s", admin.username, user.username)
    return MessageResponse(message=f"User {user.username} successfully unsuspended.")


@router.post("/users/{user_id}/ban", response_model=MessageResponse)
async def ban_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> MessageResponse:
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot ban your own account.",
        )

    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.role == "admin":
        # Final active admin protection check
        active_admins_res = await db.execute(
            select(func.count(User.id)).where(User.role == "admin", User.status == "ACTIVE")
        )
        active_admins = active_admins_res.scalar() or 0
        if user.status == "ACTIVE" and active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot ban the final active administrator.",
            )

    user.status = "BANNED"
    # Auto force logout active sessions
    user.sessions_invalidated_before = datetime.now(timezone.utc)
    
    # Deactivate active sessions in DB
    from app.db.models import UserSession
    from sqlalchemy import update
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id)
        .values(is_active=False)
    )

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="ban_user",
        details=f"Admin banned user: {user.username} (ID: {user_id})",
        ip_address=admin.last_ip_address,
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="WARNING",
        ip_address=admin.last_ip_address,
        description=f"Admin banned user: {user.username} (ID: {user_id})"
    )
    await db.commit()
    logger.info("Admin %s banned user %s", admin.username, user.username)
    return MessageResponse(message=f"User {user.username} successfully banned.")


@router.post("/users/{user_id}/unban", response_model=MessageResponse)
async def unban_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> MessageResponse:
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if user.status != "BANNED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not currently banned.",
        )

    user.status = "ACTIVE"

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="unban_user",
        details=f"Admin unbanned user: {user.username} (ID: {user_id})",
        ip_address=admin.last_ip_address,
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="INFO",
        ip_address=admin.last_ip_address,
        description=f"Admin unbanned user: {user.username} (ID: {user_id})"
    )
    await db.commit()
    logger.info("Admin %s unbanned user %s", admin.username, user.username)
    return MessageResponse(message=f"User {user.username} successfully unbanned.")


@router.post("/users/{user_id}/force-logout", response_model=MessageResponse)
async def force_logout_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> MessageResponse:
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.sessions_invalidated_before = datetime.now(timezone.utc)

    # Deactivate sessions in DB
    from app.db.models import UserSession
    from sqlalchemy import update
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id)
        .values(is_active=False)
    )

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="force_logout",
        details=f"Admin forced logout on user: {user.username} (ID: {user_id})",
        ip_address=admin.last_ip_address,
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="WARNING",
        ip_address=admin.last_ip_address,
        description=f"Admin forced logout on user: {user.username} (ID: {user_id})"
    )
    await db.commit()
    logger.info("Admin %s forced logout on user id=%d", admin.username, user_id)
    return MessageResponse(message=f"Successfully logged out all active sessions for user {user.username}.")


@router.post("/users/{user_id}/force-password-reset", response_model=MessageResponse)
async def force_password_reset(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> MessageResponse:
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Generate a reset password OTP using existing infrastructure
    try:
        ctx = await otp_service.generate_and_store(db, user_id, OtpPurposeEnum.RESET_PASSWORD)
        await db.commit()

        # Send email notification to user containing OTP
        html = otp_service.render_otp_email(
            title="Reset Password Required",
            subtitle=(
                f"An administrator has forced a password reset on your account. "
                f"Please reset your password using the verification code below."
            ),
            otp=ctx.otp,
            footer="© TBH Price Tracker — If you did not request this, please contact site support.",
        )
        email_service.send_html(
            user.email,
            "Reset Password Required - TBH Price Tracker",
            html,
        )
    except RuntimeError as exc:
        logger.warning(
            "Could not send force password reset email to %s (SMTP not configured): %s. "
            "[DEVELOPMENT WORKAROUND] Plaintext OTP: %s",
            user.email, exc, ctx.otp
        )
    except Exception as exc:
        logger.error("Unexpected error generating force reset password OTP: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate verification email.",
        )

    # Log action
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="force_password_reset",
        details=f"Admin triggered forced password reset for user: {user.username} (ID: {user_id})",
        ip_address=admin.last_ip_address,
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="WARNING",
        ip_address=admin.last_ip_address,
        description=f"Admin forced password reset for user: {user.username} (ID: {user_id})"
    )
    await db.commit()
    logger.info("Admin %s triggered force password reset for user %s", admin.username, user.username)
    return MessageResponse(
        message=f"Forced password reset triggered. Reset link/code sent to user {user.username}'s email."
    )


@router.get("/security/stats")
async def get_security_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Retrieve security dashboard statistics."""
    from app.db.models import User, UserLoginHistory, SecurityEvent
    from sqlalchemy import select, func, and_
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Today's Logins (Successful)
    logins_res = await db.execute(
        select(func.count(UserLoginHistory.id)).where(
            and_(
                UserLoginHistory.result == "SUCCESS",
                UserLoginHistory.timestamp >= today_start
            )
        )
    )
    todays_logins = logins_res.scalar() or 0
    
    # Failed Logins
    failed_res = await db.execute(
        select(func.count(UserLoginHistory.id)).where(
            and_(
                UserLoginHistory.result == "FAILURE",
                UserLoginHistory.timestamp >= today_start
            )
        )
    )
    failed_logins = failed_res.scalar() or 0
    
    # Password Resets (Today)
    resets_res = await db.execute(
        select(func.count(SecurityEvent.id)).where(
            and_(
                SecurityEvent.description.ilike("%password reset%"),
                SecurityEvent.timestamp >= today_start
            )
        )
    )
    password_resets = resets_res.scalar() or 0
    
    # New Users (Registered Today)
    new_users_res = await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )
    new_users = new_users_res.scalar() or 0
    
    # Suspended Users
    susp_res = await db.execute(select(func.count(User.id)).where(User.status == "SUSPENDED"))
    suspended_users = susp_res.scalar() or 0
    
    # Banned Users
    ban_res = await db.execute(select(func.count(User.id)).where(User.status == "BANNED"))
    banned_users = ban_res.scalar() or 0
    
    # Security Events Today
    events_res = await db.execute(
        select(func.count(SecurityEvent.id)).where(SecurityEvent.timestamp >= today_start)
    )
    security_events_today = events_res.scalar() or 0
    
    return {
        "todays_logins": todays_logins,
        "failed_logins": failed_logins,
        "password_resets": password_resets,
        "new_users": new_users,
        "suspended_users": suspended_users,
        "banned_users": banned_users,
        "security_events_today": security_events_today,
    }


@router.get("/security/sessions")
async def search_active_sessions(
    username: str | None = Query(None),
    ip_address: str | None = Query(None),
    browser: str | None = Query(None),
    os: str | None = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """List and search all active sessions in the system."""
    from app.db.models import UserSession, User
    from sqlalchemy import select, and_, desc, or_
    
    stmt = select(UserSession).join(User).where(UserSession.is_active == True)
    
    if username:
        stmt = stmt.where(
            or_(
                User.username.ilike(f"%{username}%"),
                User.email.ilike(f"%{username}%")
            )
        )
    if ip_address:
        stmt = stmt.where(UserSession.ip_address.ilike(f"%{ip_address}%"))
    if browser:
        stmt = stmt.where(UserSession.browser.ilike(f"%{browser}%"))
    if os:
        stmt = stmt.where(UserSession.os.ilike(f"%{os}%"))
        
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0
    
    stmt = stmt.order_by(desc(UserSession.created_at)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "sessions": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "username": s.user.username,
                "email": s.user.email,
                "created_at": s.created_at,
                "last_activity_at": s.last_activity_at,
                "ip_address": s.ip_address,
                "browser": s.browser,
                "os": s.os,
                "device": s.device,
            }
            for s in sessions
        ]
    }


@router.post("/security/sessions/{session_id}/terminate")
async def admin_terminate_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Terminate any specific active session."""
    from app.db.models import UserSession
    from sqlalchemy import select
    res = await db.execute(select(UserSession).where(UserSession.id == session_id))
    user_session = res.scalar_one_or_none()
    if not user_session:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    user_session.is_active = False
    
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="admin_force_logout",
        details=f"Admin terminated session {session_id} for user ID {user_session.user_id}",
        ip_address=admin.last_ip_address
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="WARNING",
        ip_address=admin.last_ip_address,
        description=f"Admin terminated session {session_id} for user ID {user_session.user_id}"
    )
    await db.commit()
    return {"message": "Session terminated successfully."}


@router.post("/security/users/{user_id}/terminate-all")
async def admin_terminate_all_sessions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Terminate all active sessions for a specified user."""
    from app.db.models import UserSession, User
    user = await crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    from sqlalchemy import select, and_
    stmt = select(UserSession).where(
        and_(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        )
    )
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    
    for s in sessions:
        s.is_active = False
        
    user.sessions_invalidated_before = datetime.now(timezone.utc)
    
    await crud.log_activity(
        db,
        user_id=admin.id,
        username=admin.username,
        action="admin_force_logout",
        details=f"Admin terminated all {len(sessions)} active sessions for user {user.username}",
        ip_address=admin.last_ip_address
    )
    await crud.log_security_event(
        db,
        user_id=admin.id,
        severity="WARNING",
        ip_address=admin.last_ip_address,
        description=f"Admin terminated all {len(sessions)} sessions for user {user.username}"
    )
    await db.commit()
    return {"message": f"Successfully terminated all {len(sessions)} active sessions for user {user.username}."}


@router.get("/security/events")
async def search_security_events(
    username: str | None = Query(None),
    ip_address: str | None = Query(None),
    severity: str | None = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
) -> dict:
    """Search and filter system security audit events."""
    from app.db.models import SecurityEvent, User
    from sqlalchemy import select, func, and_, desc, or_
    
    stmt = select(SecurityEvent).outerjoin(User)
    
    if username:
        stmt = stmt.where(
            or_(
                User.username.ilike(f"%{username}%"),
                User.email.ilike(f"%{username}%")
            )
        )
    if ip_address:
        stmt = stmt.where(SecurityEvent.ip_address.ilike(f"%{ip_address}%"))
    if severity:
        stmt = stmt.where(SecurityEvent.severity == severity)
        
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0
    
    stmt = stmt.order_by(desc(SecurityEvent.timestamp)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    events = res.scalars().all()
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "events": [
            {
                "id": e.id,
                "timestamp": e.timestamp,
                "severity": e.severity,
                "user_id": e.user_id,
                "username": e.user.username if e.user else None,
                "email": e.user.email if e.user else None,
                "ip_address": e.ip_address,
                "description": e.description,
            }
            for e in events
        ]
    }
