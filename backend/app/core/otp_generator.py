"""
OTP Generator — cryptographically secure numeric OTP.

Uses secrets.randbelow() per digit. Never uses random.random().
Length is configurable; defaults to settings.otp_length.
"""

from __future__ import annotations

import secrets

from app.core.config import settings


def generate_otp(length: int | None = None) -> str:
    """
    Generate a numeric OTP string of the given length.

    Args:
        length: Number of digits. Defaults to settings.otp_length (6).

    Returns:
        Zero-padded numeric string, e.g. "042819".
    """
    n = length if length is not None else settings.otp_length
    digits = [str(secrets.randbelow(10)) for _ in range(n)]
    return "".join(digits)
