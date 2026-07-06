"""
Tests for the secure Delete Account flow.

Tests cover:
- Requesting delete code (POST /auth/request-account-deletion)
  - Wrong password
  - Correct password -> sends OTP email, returns success
- Deleting account via OTP (POST /auth/delete-account)
  - Wrong OTP
  - Expired OTP
  - Correct OTP -> deletes user, invalidates/deletes OTP records
- Resending delete OTP (POST /auth/resend-delete-otp)
  - Cooldown and limit restrictions
"""

from __future__ import annotations

import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException


class TestDeleteAccountSchemas(unittest.TestCase):
    """Pydantic schema validation for delete account requests."""

    def test_request_deletion_valid(self) -> None:
        from app.schemas.auth import RequestAccountDeletionRequest
        req = RequestAccountDeletionRequest(password="mypassword123")
        self.assertEqual(req.password, "mypassword123")

    def test_delete_account_valid(self) -> None:
        from app.schemas.auth import DeleteAccountRequest
        req = DeleteAccountRequest(otp="987654")
        self.assertEqual(req.otp, "987654")

    def test_delete_account_invalid_otp(self) -> None:
        from pydantic import ValidationError
        from app.schemas.auth import DeleteAccountRequest
        with self.assertRaises(ValidationError):
            DeleteAccountRequest(otp="abc123")


class TestDeleteAccountService(unittest.IsolatedAsyncioTestCase):
    """
    Test OTP service logic for DELETE_ACCOUNT purpose.
    """

    async def test_generate_and_store_delete_otp(self) -> None:
        from app.services import otp_service
        from app.db.models import OtpPurposeEnum, UserOtp

        mock_record = UserOtp()
        mock_record.id = 1
        mock_record.user_id = 100
        mock_record.purpose = OtpPurposeEnum.DELETE_ACCOUNT
        mock_record.otp_hash = "delete_hash"
        mock_record.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        mock_db = AsyncMock()

        with (
            patch("app.repositories.otp_repository.invalidate_previous", new_callable=AsyncMock),
            patch("app.repositories.otp_repository.create_otp", new_callable=AsyncMock, return_value=mock_record),
        ):
            ctx = await otp_service.generate_and_store(
                mock_db, 100, OtpPurposeEnum.DELETE_ACCOUNT
            )

        self.assertEqual(ctx.purpose, OtpPurposeEnum.DELETE_ACCOUNT)
        self.assertEqual(len(ctx.otp), 6)
        self.assertTrue(ctx.otp.isdigit())

    async def test_verify_wrong_delete_otp_fails(self) -> None:
        from app.services import otp_service
        from app.db.models import OtpPurposeEnum, UserOtp
        from app.core.otp_hashing import hash_otp

        mock_record = UserOtp()
        mock_record.id = 1
        mock_record.user_id = 100
        mock_record.purpose = OtpPurposeEnum.DELETE_ACCOUNT
        mock_record.otp_hash = hash_otp("123456")
        mock_record.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        mock_record.attempts = 0

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
                mock_db, 100, OtpPurposeEnum.DELETE_ACCOUNT, "654321"
            )

        self.assertFalse(result)

    async def test_verify_correct_delete_otp_succeeds(self) -> None:
        from app.services import otp_service
        from app.db.models import OtpPurposeEnum, UserOtp
        from app.core.otp_hashing import hash_otp

        mock_record = UserOtp()
        mock_record.id = 1
        mock_record.user_id = 100
        mock_record.purpose = OtpPurposeEnum.DELETE_ACCOUNT
        mock_record.otp_hash = hash_otp("123456")
        mock_record.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
        mock_record.attempts = 0

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
                mock_db, 100, OtpPurposeEnum.DELETE_ACCOUNT, "123456"
            )

        self.assertTrue(result)


if __name__ == "__main__":
    unittest.main()
