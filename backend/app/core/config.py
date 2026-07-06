"""
Application configuration loaded from environment variables.
Uses Pydantic BaseSettings for validation and .env file support.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All configuration is read from environment variables or a .env file.
    Never commit .env to source control.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "TBH Inventory Price Tracker"
    debug: bool = False

    # Security
    secret_key: str = "change-me-in-production-use-a-long-random-string"
    cookie_secure: bool | None = None

    @property
    def secure_cookies(self) -> bool:
        if self.cookie_secure is not None:
            return self.cookie_secure
        return not self.debug

    # CORS — space-separated list of allowed origins
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # Steam
    steam_app_id: int = 3678970
    steam_request_delay_seconds: int = 3

    # Scheduler
    refresh_interval_minutes: int = 30

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/tbh_price"

    # SMTP — email sending (all optional; email features are disabled if smtp_host is unset)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "noreply@example.com"
    smtp_tls: bool = True

    # OTP — one-time password configuration
    otp_expire_minutes: int = 5
    otp_length: int = 6
    otp_resend_seconds: int = 60
    otp_max_attempts: int = 5
    otp_max_resend: int = 3


settings = Settings()
