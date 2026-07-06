"""
Email Service — sends plain-text and HTML emails via SMTP.

Uses Python's stdlib smtplib and email.mime only.
No third-party email library is required.

Raises RuntimeError if SMTP is not configured, so callers can decide
whether to log-and-skip or propagate the error.
"""

from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Thin wrapper around smtplib for sending transactional email."""

    def _check_configured(self) -> None:
        if not settings.smtp_host:
            raise RuntimeError(
                "SMTP is not configured. Set SMTP_HOST (and related variables) "
                "in your environment to enable email sending."
            )

    def _build_connection(self) -> smtplib.SMTP:
        """Open and authenticate an SMTP connection."""
        smtp = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
        if settings.smtp_tls:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        return smtp

    def send_email(self, to: str, subject: str, body_text: str) -> None:
        """
        Send a plain-text email.

        Args:
            to: Recipient email address.
            subject: Email subject line.
            body_text: Plain-text message body.

        Raises:
            RuntimeError: If SMTP is not configured.
            smtplib.SMTPException: On any SMTP-level error.
        """
        self._check_configured()
        msg = MIMEText(body_text, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = to

        with self._build_connection() as smtp:
            smtp.sendmail(settings.smtp_from, [to], msg.as_string())

        logger.info("Plain-text email sent to %s | subject: %s", to, subject)

    def send_html(self, to: str, subject: str, html_body: str) -> None:
        """
        Send an HTML email (with a plain-text fallback stripped from the HTML).

        Args:
            to: Recipient email address.
            subject: Email subject line.
            html_body: HTML message body.

        Raises:
            RuntimeError: If SMTP is not configured.
            smtplib.SMTPException: On any SMTP-level error.
        """
        self._check_configured()
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_from
        msg["To"] = to

        # Plain-text fallback for clients that don't render HTML
        plain_fallback = (
            f"Your OTP code is in the HTML part of this email.\n"
            f"If you cannot view it, please use a modern email client."
        )
        msg.attach(MIMEText(plain_fallback, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with self._build_connection() as smtp:
            smtp.sendmail(settings.smtp_from, [to], msg.as_string())

        logger.info("HTML email sent to %s | subject: %s", to, subject)


# Module-level singleton — import and use directly
email_service = EmailService()
