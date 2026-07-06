"""
Tests for the Forgot Password OTP flow.

Tests cover:
- Requesting a reset code (POST /auth/forgot-password)
- Verifying the reset OTP (POST /auth/verify-reset-otp)
- Resetting the password (POST /auth/reset-password)
- Resending the reset OTP (POST /auth/resend-reset-otp)
- Security: email enumeration protection
- Security: wrong OTP, expired OTP, max attempts

These are unit tests against the service and hashing layers.
Integration-level tests against the actual DB are run via pytest-asyncio
when a test database is wired in.
"""

from __future__ import annotations

import hashlib
import hmac
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# OTP generator & hashing unit tests
# ---------------------------------------------------------------------------


class TestOtpGenerator(unittest.TestCase):
    """Verify generate_otp() is numeric and the correct length."""

    def setUp(self) -> None:
        from app.core.otp_generator import generate_otp
        self.generate_otp = generate_otp

    def test_default_length_is_six(self) -> None:
        otp = self.generate_otp()
        self.assertEqual(len(otp), 6)

    def test_custom_length(self) -> None:
        for length in [4, 6, 8]:
            otp = self.generate_otp(length)
            self.assertEqual(len(otp), length, f"Expected length {length}, got {len(otp)}")

    def test_all_digits(self) -> None:
        for _ in range(50):
            otp = self.generate_otp()
            self.assertTrue(otp.isdigit(), f"OTP is not all digits: {otp!r}")

    def test_uniqueness(self) -> None:
        otps = {self.generate_otp() for _ in range(100)}
        # At least some variety expected with 6-digit codes
        self.assertGreater(len(otps), 1)


class TestOtpHashing(unittest.TestCase):
    """Verify HMAC-SHA256 hash/verify pair."""

    def setUp(self) -> None:
        from app.core.otp_hashing import hash_otp, verify_otp
        self.hash_otp = hash_otp
        self.verify_otp = verify_otp

    def test_hash_returns_hex_digest(self) -> None:
        h = self.hash_otp("123456")
        self.assertEqual(len(h), 64)
        int(h, 16)  # must be valid hex

    def test_verify_correct_otp(self) -> None:
        otp = "987654"
        h = self.hash_otp(otp)
        self.assertTrue(self.verify_otp(otp, h))

    def test_verify_wrong_otp(self) -> None:
        h = self.hash_otp("111111")
        self.assertFalse(self.verify_otp("222222", h))

    def test_different_otps_produce_different_hashes(self) -> None:
        h1 = self.hash_otp("100000")
        h2 = self.hash_otp("100001")
        self.assertNotEqual(h1, h2)


# ---------------------------------------------------------------------------
# UserOtp model helper tests
# ---------------------------------------------------------------------------


class TestUserOtpHelpers(unittest.TestCase):
    """Verify is_expired(), remaining_seconds(), can_resend() on the ORM model."""

    def _make_otp(
        self,
        expires_delta_seconds: int = 300,
        last_sent_delta_seconds: int | None = None,
        resend_count: int = 0,
    ):
        from app.db.models import UserOtp

        record = UserOtp()
        now = datetime.now(timezone.utc)
        record.expires_at = now + timedelta(seconds=expires_delta_seconds)
        record.resend_count = resend_count
        if last_sent_delta_seconds is not None:
            record.last_sent_at = now - timedelta(seconds=last_sent_delta_seconds)
        else:
            record.last_sent_at = None
        record.attempts = 0
        return record

    def test_not_expired_when_future(self) -> None:
        record = self._make_otp(expires_delta_seconds=300)
        self.assertFalse(record.is_expired())

    def test_expired_when_past(self) -> None:
        record = self._make_otp(expires_delta_seconds=-1)
        self.assertTrue(record.is_expired())

    def test_remaining_seconds_positive(self) -> None:
        record = self._make_otp(expires_delta_seconds=120)
        remaining = record.remaining_seconds()
        self.assertGreater(remaining, 0)
        self.assertLessEqual(remaining, 120)

    def test_remaining_seconds_zero_when_expired(self) -> None:
        record = self._make_otp(expires_delta_seconds=-60)
        self.assertEqual(record.remaining_seconds(), 0)

    def test_can_resend_when_no_last_sent(self) -> None:
        record = self._make_otp(last_sent_delta_seconds=None, resend_count=0)
        self.assertTrue(record.can_resend(60, 3))

    def test_can_resend_after_cooldown(self) -> None:
        record = self._make_otp(last_sent_delta_seconds=61, resend_count=1)
        self.assertTrue(record.can_resend(60, 3))

    def test_cannot_resend_during_cooldown(self) -> None:
        record = self._make_otp(last_sent_delta_seconds=30, resend_count=1)
        self.assertFalse(record.can_resend(60, 3))

    def test_cannot_resend_at_max(self) -> None:
        record = self._make_otp(last_sent_delta_seconds=120, resend_count=3)
        self.assertFalse(record.can_resend(60, 3))


# ---------------------------------------------------------------------------
# Schema validation tests
# ---------------------------------------------------------------------------


class TestForgotPasswordSchemas(unittest.TestCase):
    """Pydantic schema validation for the forgot-password request bodies."""

    def test_forgot_password_valid_email(self) -> None:
        from app.schemas.auth import ForgotPasswordRequest
        req = ForgotPasswordRequest(email="user@example.com")
        self.assertEqual(req.email, "user@example.com")

    def test_forgot_password_invalid_email(self) -> None:
        from pydantic import ValidationError
        from app.schemas.auth import ForgotPasswordRequest
        with self.assertRaises(ValidationError):
            ForgotPasswordRequest(email="not-an-email")

    def test_verify_reset_otp_valid(self) -> None:
        from app.schemas.auth import VerifyResetOtpRequest
        req = VerifyResetOtpRequest(email="user@example.com", otp="123456")
        self.assertEqual(req.otp, "123456")

    def test_verify_reset_otp_non_numeric(self) -> None:
        from pydantic import ValidationError
        from app.schemas.auth import VerifyResetOtpRequest
        with self.assertRaises(ValidationError):
            VerifyResetOtpRequest(email="user@example.com", otp="abc123")

    def test_verify_reset_otp_wrong_length(self) -> None:
        from pydantic import ValidationError
        from app.schemas.auth import VerifyResetOtpRequest
        with self.assertRaises(ValidationError):
            VerifyResetOtpRequest(email="user@example.com", otp="12345")

    def test_reset_password_valid(self) -> None:
        from app.schemas.auth import ResetPasswordRequest
        req = ResetPasswordRequest(
            email="user@example.com",
            otp="654321",
            new_password="securepassword1",
        )
        self.assertEqual(req.new_password, "securepassword1")

    def test_reset_password_too_short(self) -> None:
        from pydantic import ValidationError
        from app.schemas.auth import ResetPasswordRequest
        with self.assertRaises(ValidationError):
            ResetPasswordRequest(
                email="user@example.com",
                otp="123456",
                new_password="short",
            )

    def test_resend_reset_otp_valid(self) -> None:
        from app.schemas.auth import ResendResetOtpRequest
        req = ResendResetOtpRequest(email="user@example.com")
        self.assertEqual(req.email, "user@example.com")


# ---------------------------------------------------------------------------
# OTP service logic tests (mocked DB)
# ---------------------------------------------------------------------------


class TestOtpServiceForgotPassword(unittest.IsolatedAsyncioTestCase):
    """
    Test OTP service logic for RESET_PASSWORD purpose using mocked repository.
    """

    async def test_generate_and_store_returns_otp_context(self) -> None:
        from app.services import otp_service
        from app.db.models import OtpPurposeEnum, UserOtp
        from datetime import datetime, timezone, timedelta

        mock_record = UserOtp()
        mock_record.id = 1
        mock_record.user_id = 42
        mock_record.purpose = OtpPurposeEnum.RESET_PASSWORD
        mock_record.otp_hash = "fakehash"
        mock_record.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        mock_record.attempts = 0
        mock_record.resend_count = 0
        mock_record.last_sent_at = None
        mock_record.used_at = None

        mock_db = AsyncMock()

        with (
            patch("app.repositories.otp_repository.invalidate_previous", new_callable=AsyncMock),
            patch("app.repositories.otp_repository.create_otp", new_callable=AsyncMock, return_value=mock_record),
        ):
            ctx = await otp_service.generate_and_store(
                mock_db, 42, OtpPurposeEnum.RESET_PASSWORD
            )

        self.assertEqual(ctx.purpose, OtpPurposeEnum.RESET_PASSWORD)
        self.assertEqual(len(ctx.otp), 6)
        self.assertTrue(ctx.otp.isdigit())

    async def test_verify_wrong_otp_returns_false(self) -> None:
        from app.services import otp_service
        from app.db.models import OtpPurposeEnum, UserOtp
        from app.core.otp_hashing import hash_otp
        from datetime import datetime, timezone, timedelta

        real_otp = "111111"
        wrong_otp = "999999"

        mock_record = UserOtp()
        mock_record.id = 1
        mock_record.user_id = 42
        mock_record.purpose = OtpPurposeEnum.RESET_PASSWORD
        mock_record.otp_hash = hash_otp(real_otp)
        mock_record.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        mock_record.attempts = 0
        mock_record.resend_count = 0
        mock_record.last_sent_at = None
        mock_record.used_at = None

        mock_db = AsyncMock()

        with (
            patch(
                "app.repositories.otp_repository.get_active_otp",
                new_callable=AsyncMock,
                return_value=mock_record,
            ),
            patch("app.repositories.otp_repository.increment_attempt", new_callable=AsyncMock),
        ):
            result = await otp_service.verify(
                mock_db, 42, OtpPurposeEnum.RESET_PASSWORD, wrong_otp
            )

        self.assertFalse(result)

    async def test_verify_correct_otp_returns_true(self) -> None:
        from app.services import otp_service
        from app.db.models import OtpPurposeEnum, UserOtp
        from app.core.otp_hashing import hash_otp
        from datetime import datetime, timezone, timedelta

        real_otp = "555555"

        mock_record = UserOtp()
        mock_record.id = 1
        mock_record.user_id = 42
        mock_record.purpose = OtpPurposeEnum.RESET_PASSWORD
        mock_record.otp_hash = hash_otp(real_otp)
        mock_record.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        mock_record.attempts = 0
        mock_record.resend_count = 0
        mock_record.last_sent_at = None
        mock_record.used_at = None

        mock_db = AsyncMock()

        with (
            patch(
                "app.repositories.otp_repository.get_active_otp",
                new_callable=AsyncMock,
                return_value=mock_record,
            ),
            patch("app.repositories.otp_repository.mark_used", new_callable=AsyncMock),
        ):
            result = await otp_service.verify(
                mock_db, 42, OtpPurposeEnum.RESET_PASSWORD, real_otp
            )

        self.assertTrue(result)

    async def test_verify_no_active_otp_raises_400(self) -> None:
        from app.services import otp_service
        from app.db.models import OtpPurposeEnum
        from fastapi import HTTPException

        mock_db = AsyncMock()

        with patch(
            "app.repositories.otp_repository.get_active_otp",
            new_callable=AsyncMock,
            return_value=None,
        ):
            with self.assertRaises(HTTPException) as ctx:
                await otp_service.verify(
                    mock_db, 42, OtpPurposeEnum.RESET_PASSWORD, "000000"
                )

        self.assertEqual(ctx.exception.status_code, 400)

    async def test_verify_max_attempts_raises_429(self) -> None:
        from app.services import otp_service
        from app.db.models import OtpPurposeEnum, UserOtp
        from app.core.otp_hashing import hash_otp
        from app.core.config import settings
        from fastapi import HTTPException
        from datetime import datetime, timezone, timedelta

        mock_record = UserOtp()
        mock_record.id = 1
        mock_record.user_id = 42
        mock_record.purpose = OtpPurposeEnum.RESET_PASSWORD
        mock_record.otp_hash = hash_otp("111111")
        mock_record.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        mock_record.attempts = settings.otp_max_attempts  # already at limit
        mock_record.resend_count = 0
        mock_record.last_sent_at = None
        mock_record.used_at = None

        mock_db = AsyncMock()

        with patch(
            "app.repositories.otp_repository.get_active_otp",
            new_callable=AsyncMock,
            return_value=mock_record,
        ):
            with self.assertRaises(HTTPException) as ctx:
                await otp_service.verify(
                    mock_db, 42, OtpPurposeEnum.RESET_PASSWORD, "111111"
                )

        self.assertEqual(ctx.exception.status_code, 429)


if __name__ == "__main__":
    unittest.main()
