"""Pydantic v2 schemas for authentication endpoints."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


from datetime import datetime


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    username: str
    email: str
    role: str
    username_changes_count: int
    last_email_changed_at: datetime | None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class PasswordResetRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    """Returned by POST /auth/register after email-verification flow is triggered."""
    message: str
    email: str  # partially masked: u***@example.com


class VerifyEmailRequest(BaseModel):
    """Body for POST /auth/verify-email."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResendVerificationRequest(BaseModel):
    """Body for POST /auth/resend-verification."""
    email: EmailStr


class MessageResponse(BaseModel):
    """Generic success message response."""
    message: str


# ---------------------------------------------------------------------------
# Forgot Password schemas
# ---------------------------------------------------------------------------


class ForgotPasswordRequest(BaseModel):
    """Body for POST /auth/forgot-password."""
    email: EmailStr


class VerifyResetOtpRequest(BaseModel):
    """Body for POST /auth/verify-reset-otp — confirms OTP before password change."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class ResetPasswordRequest(BaseModel):
    """Body for POST /auth/reset-password — verifies OTP and sets new password."""
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8, max_length=128)


class ResendResetOtpRequest(BaseModel):
    """Body for POST /auth/resend-reset-otp."""
    email: EmailStr


# ---------------------------------------------------------------------------
# Delete Account schemas
# ---------------------------------------------------------------------------


class RequestAccountDeletionRequest(BaseModel):
    """Body for POST /auth/request-account-deletion."""
    password: str


class DeleteAccountRequest(BaseModel):
    """Body for POST /auth/delete-account."""
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


# ---------------------------------------------------------------------------
# Username/Email Edit schemas
# ---------------------------------------------------------------------------


class UpdateUsernameRequest(BaseModel):
    new_username: str = Field(..., min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")


class RequestEmailChangeRequest(BaseModel):
    new_email: EmailStr


class ConfirmEmailChangeRequest(BaseModel):
    new_email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

