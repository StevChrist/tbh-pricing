"""
Tests for Enterprise User Management Admin Actions.
"""

from __future__ import annotations

import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException, status
from app.db.models import User, OtpPurposeEnum


class TestAdminManagementActions(unittest.IsolatedAsyncioTestCase):
    """
    Unit tests for admin management endpoints and security rules.
    """

    def setUp(self) -> None:
        self.admin = User(
            id=1,
            username="admin_user",
            email="admin@example.com",
            role="admin",
            status="ACTIVE",
            email_verified=True,
            last_ip_address="127.0.0.1",
        )
        self.user = User(
            id=2,
            username="test_user",
            email="user@example.com",
            role="user",
            status="ACTIVE",
            email_verified=True,
        )

    async def test_suspend_user_success(self) -> None:
        from app.api.routes.admin import suspend_user

        mock_db = AsyncMock()
        
        # Mock get_user_by_id and log_activity
        with (
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=self.user),
            patch("app.db.crud.log_activity", new_callable=AsyncMock) as mock_log,
        ):
            res = await suspend_user(user_id=2, db=mock_db, admin=self.admin)
            
        self.assertEqual(self.user.status, "SUSPENDED")
        self.assertIsNotNone(self.user.sessions_invalidated_before)
        self.assertIn("suspended", res.message)
        mock_log.assert_called_once()

    async def test_suspend_self_fails(self) -> None:
        from app.api.routes.admin import suspend_user

        mock_db = AsyncMock()
        
        with self.assertRaises(HTTPException) as ctx:
            await suspend_user(user_id=1, db=mock_db, admin=self.admin)
            
        self.assertEqual(ctx.exception.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot suspend your own account", ctx.exception.detail)

    async def test_suspend_final_admin_fails(self) -> None:
        from app.api.routes.admin import suspend_user

        mock_db = AsyncMock()
        target_admin = User(
            id=3,
            username="admin2",
            email="admin2@example.com",
            role="admin",
            status="ACTIVE",
        )
        
        # Mock query return: only 1 active admin (the target user itself)
        mock_scalar = MagicMock()
        mock_scalar.scalar.return_value = 1
        mock_db.execute.return_value = mock_scalar

        with (
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=target_admin),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await suspend_user(user_id=3, db=mock_db, admin=self.admin)

        self.assertEqual(ctx.exception.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("final active administrator", ctx.exception.detail)

    async def test_ban_user_success(self) -> None:
        from app.api.routes.admin import ban_user

        mock_db = AsyncMock()
        
        with (
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=self.user),
            patch("app.db.crud.log_activity", new_callable=AsyncMock),
        ):
            res = await ban_user(user_id=2, db=mock_db, admin=self.admin)
            
        self.assertEqual(self.user.status, "BANNED")
        self.assertIsNotNone(self.user.sessions_invalidated_before)
        self.assertIn("banned", res.message)

    async def test_ban_self_fails(self) -> None:
        from app.api.routes.admin import ban_user

        mock_db = AsyncMock()
        
        with self.assertRaises(HTTPException) as ctx:
            await ban_user(user_id=1, db=mock_db, admin=self.admin)
            
        self.assertEqual(ctx.exception.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot ban your own account", ctx.exception.detail)

    async def test_unsuspend_user_success(self) -> None:
        from app.api.routes.admin import unsuspend_user

        self.user.status = "SUSPENDED"
        mock_db = AsyncMock()
        
        with (
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=self.user),
            patch("app.db.crud.log_activity", new_callable=AsyncMock),
        ):
            res = await unsuspend_user(user_id=2, db=mock_db, admin=self.admin)
            
        self.assertEqual(self.user.status, "ACTIVE")
        self.assertIn("unsuspended", res.message)

    async def test_force_logout_user(self) -> None:
        from app.api.routes.admin import force_logout_user

        mock_db = AsyncMock()
        
        with (
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=self.user),
            patch("app.db.crud.log_activity", new_callable=AsyncMock),
        ):
            res = await force_logout_user(user_id=2, db=mock_db, admin=self.admin)
            
        self.assertIsNotNone(self.user.sessions_invalidated_before)
        self.assertIn("logged out all active sessions", res.message)

    async def test_force_password_reset(self) -> None:
        from app.api.routes.admin import force_password_reset

        mock_db = AsyncMock()
        mock_ctx = MagicMock()
        mock_ctx.otp = "654321"
        
        with (
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=self.user),
            patch("app.services.otp_service.generate_and_store", new_callable=AsyncMock, return_value=mock_ctx),
            patch("app.services.otp_service.render_otp_email", return_value="html"),
            patch("app.services.email_service.email_service.send_html"),
            patch("app.db.crud.log_activity", new_callable=AsyncMock),
        ):
            res = await force_password_reset(user_id=2, db=mock_db, admin=self.admin)
            
        self.assertIn("Forced password reset triggered", res.message)


class TestAuthenticationStatusChecks(unittest.IsolatedAsyncioTestCase):
    """
    Unit tests for authentication status validation guards.
    """

    async def test_get_current_user_suspended_raises_403(self) -> None:
        from app.api.deps import get_current_user

        suspended_user = User(
            id=10,
            username="suspended",
            email="s@example.com",
            status="SUSPENDED",
        )
        mock_db = AsyncMock()
        mock_response = MagicMock()
        mock_request = MagicMock()

        with (
            patch("app.core.security.decode_access_token", return_value={"sub": "10", "session_start": int(datetime.now().timestamp())}),
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=suspended_user),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await get_current_user(
                    response=mock_response,
                    request=mock_request,
                    access_token="valid_jwt",
                    db=mock_db,
                )

        self.assertEqual(ctx.exception.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("suspended", ctx.exception.detail)

    async def test_get_current_user_banned_raises_403(self) -> None:
        from app.api.deps import get_current_user

        banned_user = User(
            id=11,
            username="banned",
            email="b@example.com",
            status="BANNED",
        )
        mock_db = AsyncMock()
        mock_response = MagicMock()
        mock_request = MagicMock()

        with (
            patch("app.core.security.decode_access_token", return_value={"sub": "11", "session_start": int(datetime.now().timestamp())}),
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=banned_user),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await get_current_user(
                    response=mock_response,
                    request=mock_request,
                    access_token="valid_jwt",
                    db=mock_db,
                )

        self.assertEqual(ctx.exception.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("permanently banned", ctx.exception.detail)

    async def test_get_current_user_force_logout_raises_401(self) -> None:
        from app.api.deps import get_current_user

        # User forced logout 5 minutes ago
        invalidated_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        # Token session started 10 minutes ago (before invalidation)
        token_session_start = int((datetime.now(timezone.utc) - timedelta(minutes=10)).timestamp())

        user = User(
            id=12,
            username="logout_user",
            email="l@example.com",
            status="ACTIVE",
            sessions_invalidated_before=invalidated_time,
        )
        mock_db = AsyncMock()
        mock_response = MagicMock()
        mock_request = MagicMock()

        with (
            patch("app.core.security.decode_access_token", return_value={"sub": "12", "session_start": token_session_start}),
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=user),
        ):
            with self.assertRaises(HTTPException) as ctx:
                await get_current_user(
                    response=mock_response,
                    request=mock_request,
                    access_token="valid_jwt",
                    db=mock_db,
                )

        self.assertEqual(ctx.exception.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("Session invalidated", ctx.exception.detail)
        mock_response.delete_cookie.assert_called_once()
