"""
OTP Hashing — HMAC-SHA256 based hash and verify.

Why HMAC-SHA256 over bcrypt:
- OTPs are short-lived (5 min), numeric, and already rate-limited.
- HMAC is constant-time via hmac.compare_digest(), preventing timing attacks.
- The SECRET_KEY acts as the HMAC key: a stolen DB hash is useless without it.
- Deterministic and fast — appropriate for time-bound tokens.

OTPs are NEVER stored as plaintext.
"""

from __future__ import annotations

import hashlib
import hmac

from app.core.config import settings


def _key() -> bytes:
    """Return the HMAC key bytes derived from SECRET_KEY."""
    return settings.secret_key.encode("utf-8")


def hash_otp(otp: str) -> str:
    """
    Hash an OTP using HMAC-SHA256 with the application SECRET_KEY.

    Returns:
        Hex digest string (64 characters).
    """
    return hmac.new(_key(), otp.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_otp(plain: str, hashed: str) -> bool:
    """
    Constant-time comparison of a plaintext OTP against its stored hash.

    Returns:
        True if the OTP matches, False otherwise.
    """
    expected = hash_otp(plain)
    return hmac.compare_digest(expected, hashed)
