"""
Unit tests for the Session Management and Security Monitoring features.
"""

from __future__ import annotations

import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException, status
from app.db.models import User, UserSession, UserLoginHistory, SecurityEvent


class TestSecurityMonitoring(unittest.IsolatedAsyncioTestCase):
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
            last_ip_address="192.168.1.100",
        )
        self.session = UserSession(
            id="session-123",
            user_id=2,
            ip_address="192.168.1.100",
            browser="Chrome",
            os="Windows",
            device="Desktop",
            is_active=True,
            created_at=datetime.now(timezone.utc),
            last_activity_at=datetime.now(timezone.utc),
        )
        self.session.user = self.user

    async def test_logout_deactivates_session_and_logs(self) -> None:
        from app.api.routes.auth import logout

        mock_db = AsyncMock()
        mock_db.add = MagicMock()
        mock_response = MagicMock()
        mock_request = MagicMock()
        mock_request.cookies = {"access_token": "valid_token"}
        mock_request.headers = {"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        mock_request.client.host = "192.168.1.100"

        # Mock database session lookup
        mock_execute = MagicMock()
        mock_execute.scalar_one_or_none.return_value = self.session
        mock_db.execute.return_value = mock_execute

        with (
            patch("app.core.security.decode_access_token", return_value={"session_id": "session-123"}),
            patch("app.db.crud.log_activity", new_callable=AsyncMock) as mock_log,
            patch("app.db.crud.log_security_event", new_callable=AsyncMock) as mock_sec,
        ):
            await logout(
                response=mock_response,
                request=mock_request,
                db=mock_db,
                current_user=self.user,
            )

        self.assertFalse(self.session.is_active)
        mock_response.delete_cookie.assert_called_once()
        mock_log.assert_called_once()
        mock_sec.assert_called_once()

    async def test_get_user_sessions(self) -> None:
        from app.api.routes.auth import get_user_sessions

        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_request.cookies = {"access_token": "token-123"}

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [self.session]
        mock_db.execute.return_value = mock_result

        with patch("app.core.security.decode_access_token", return_value={"session_id": "session-123"}):
            sessions_list = await get_user_sessions(
                request=mock_request,
                db=mock_db,
                current_user=self.user,
            )

        self.assertEqual(len(sessions_list), 1)
        self.assertEqual(sessions_list[0]["id"], "session-123")
        self.assertTrue(sessions_list[0]["is_current"])

    async def test_terminate_user_session_success(self) -> None:
        from app.api.routes.auth import terminate_user_session

        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_request.client.host = "192.168.1.100"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = self.session
        mock_db.execute.return_value = mock_result

        with (
            patch("app.db.crud.log_activity", new_callable=AsyncMock) as mock_log,
            patch("app.db.crud.log_security_event", new_callable=AsyncMock) as mock_sec,
        ):
            res = await terminate_user_session(
                session_id="session-123",
                request=mock_request,
                db=mock_db,
                current_user=self.user,
            )

        self.assertFalse(self.session.is_active)
        self.assertEqual(res.message, "Session terminated successfully.")
        mock_log.assert_called_once()
        mock_sec.assert_called_once()

    async def test_terminate_other_user_session_fails(self) -> None:
        from app.api.routes.auth import terminate_user_session

        mock_db = AsyncMock()
        mock_request = MagicMock()

        # Session belongs to different user (user_id = 999)
        self.session.user_id = 999

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = self.session
        mock_db.execute.return_value = mock_result

        with self.assertRaises(HTTPException) as context:
            await terminate_user_session(
                session_id="session-123",
                request=mock_request,
                db=mock_db,
                current_user=self.user,
            )

        self.assertEqual(context.exception.status_code, 404)

    async def test_terminate_other_sessions_success(self) -> None:
        from app.api.routes.auth import terminate_other_sessions

        mock_db = AsyncMock()
        mock_request = MagicMock()
        mock_request.cookies = {"access_token": "token-123"}
        mock_request.client.host = "192.168.1.100"

        other_session = UserSession(
            id="session-456",
            user_id=2,
            is_active=True,
        )

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [other_session]
        mock_db.execute.return_value = mock_result

        with (
            patch("app.core.security.decode_access_token", return_value={"session_id": "session-123"}),
            patch("app.db.crud.log_activity", new_callable=AsyncMock) as mock_log,
            patch("app.db.crud.log_security_event", new_callable=AsyncMock) as mock_sec,
        ):
            res = await terminate_other_sessions(
                request=mock_request,
                db=mock_db,
                current_user=self.user,
            )

        self.assertFalse(other_session.is_active)
        self.assertIn("terminated", res.message)
        mock_log.assert_called_once()
        mock_sec.assert_called_once()

    async def test_get_security_stats(self) -> None:
        from app.api.routes.admin import get_security_stats

        mock_db = AsyncMock()
        mock_exec = MagicMock()
        mock_exec.scalar.side_effect = [10, 2, 1, 3, 0, 0, 1]  # mock counts
        mock_db.execute.return_value = mock_exec

        res = await get_security_stats(db=mock_db, admin=self.admin)

        self.assertEqual(res["todays_logins"], 10)
        self.assertEqual(res["failed_logins"], 2)
        self.assertEqual(res["password_resets"], 1)
        self.assertEqual(res["new_users"], 3)

    async def test_search_active_sessions_admin(self) -> None:
        from app.api.routes.admin import search_active_sessions

        mock_db = AsyncMock()
        mock_exec = MagicMock()
        mock_exec.scalar.return_value = 1
        mock_exec.scalars.return_value.all.return_value = [self.session]
        mock_db.execute.return_value = mock_exec

        res = await search_active_sessions(
            username="test",
            limit=50,
            offset=0,
            db=mock_db,
            admin=self.admin,
        )

        self.assertEqual(res["total"], 1)
        self.assertEqual(len(res["sessions"]), 1)
        self.assertEqual(res["sessions"][0]["id"], "session-123")

    async def test_admin_terminate_session_success(self) -> None:
        from app.api.routes.admin import admin_terminate_session

        mock_db = AsyncMock()
        mock_exec = MagicMock()
        mock_exec.scalar_one_or_none.return_value = self.session
        mock_db.execute.return_value = mock_exec

        with (
            patch("app.db.crud.log_activity", new_callable=AsyncMock) as mock_log,
            patch("app.db.crud.log_security_event", new_callable=AsyncMock) as mock_sec,
        ):
            res = await admin_terminate_session(
                session_id="session-123",
                db=mock_db,
                admin=self.admin,
            )

        self.assertFalse(self.session.is_active)
        self.assertEqual(res["message"], "Session terminated successfully.")
        mock_log.assert_called_once()
        mock_sec.assert_called_once()

    async def test_admin_terminate_all_sessions_success(self) -> None:
        from app.api.routes.admin import admin_terminate_all_sessions

        mock_db = AsyncMock()
        mock_exec = MagicMock()
        mock_exec.scalars.return_value.all.return_value = [self.session]
        mock_db.execute.return_value = mock_exec

        with (
            patch("app.db.crud.get_user_by_id", new_callable=AsyncMock, return_value=self.user),
            patch("app.db.crud.log_activity", new_callable=AsyncMock) as mock_log,
            patch("app.db.crud.log_security_event", new_callable=AsyncMock) as mock_sec,
        ):
            res = await admin_terminate_all_sessions(
                user_id=2,
                db=mock_db,
                admin=self.admin,
            )

        self.assertFalse(self.session.is_active)
        self.assertIsNotNone(self.user.sessions_invalidated_before)
        self.assertIn("Successfully terminated", res["message"])
        mock_log.assert_called_once()
        mock_sec.assert_called_once()


if __name__ == "__main__":
    unittest.main()
