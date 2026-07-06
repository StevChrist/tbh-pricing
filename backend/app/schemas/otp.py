"""
Internal Pydantic schemas for the OTP service layer.

These are service-to-service contracts, not API request/response schemas.
No endpoint schemas exist yet — add them when endpoints are implemented.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.db.models import OtpPurposeEnum


class OtpContext(BaseModel):
    """
    Returned by generate_and_store() and resend().

    Carries the plaintext OTP to the caller so it can be emailed to the user.
    The plaintext OTP is never stored — only its hash is persisted.
    """

    otp: str
    expires_at: datetime
    purpose: OtpPurposeEnum
