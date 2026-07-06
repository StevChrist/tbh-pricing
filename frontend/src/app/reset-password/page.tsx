"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Loader2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { authApi, getErrorMessage } from "@/lib/api";
import axios from "axios";
import { OtpInput } from "@/components/ui/OtpInput";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  // OTP state
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));

  // Password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // 60-second resend countdown
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  // Start countdown on mount
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ---------------------------------------------------------------------------
  // Submit reset
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join("");

    if (otp.length < OTP_LENGTH) {
      toast.error("Please enter all 6 digits of your reset code.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPasswordViaOtp({
        email,
        otp,
        new_password: newPassword,
      });
      toast.success("Password updated successfully! You can now log in.");
      router.push("/login");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const httpStatus = err.response?.status;
        const detail = err.response?.data?.detail ?? "Failed to reset password.";
        if (httpStatus === 429) {
          toast.error(detail);
        } else if (httpStatus === 400) {
          toast.error(detail);
        } else {
          toast.error(detail);
        }
      } else {
        toast.error(getErrorMessage(err));
      }
      // Clear OTP boxes on failure so user can retry
      setDigits(Array(OTP_LENGTH).fill(""));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Resend OTP
  // ---------------------------------------------------------------------------

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      await authApi.resendResetOtp({ email });
      toast.success("A new reset code has been sent to your email.");
      setCanResend(false);
      setCountdown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail ?? "Failed to resend code.";
        toast.error(detail);
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setResending(false);
    }
  };

  const otpComplete = digits.every((d) => d !== "");

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg)",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "36px 32px 32px",
          boxShadow: "0 0 50px var(--glow-color)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 229, 255, 0.08)",
            border: "1px solid rgba(0, 229, 255, 0.25)",
            marginBottom: "20px",
          }}
        >
          <ShieldCheck size={26} style={{ color: "var(--cyan-highlight)" }} />
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 500,
            color: "var(--text)",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          Reset your password
        </h1>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            textAlign: "center",
            marginBottom: "4px",
            lineHeight: 1.6,
          }}
        >
          Enter the 6-digit code sent to
        </p>
        {email && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
              color: "var(--cyan-highlight)",
              fontWeight: 600,
              textAlign: "center",
              marginBottom: "28px",
              wordBreak: "break-all",
            }}
          >
            {email}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ width: "100%" }}>
          {/* OTP boxes */}
          <div style={{ marginBottom: "28px" }}>
            <OtpInput value={digits} onChange={setDigits} disabled={submitting} />
          </div>

          {/* New password */}
          <div style={{ marginBottom: "16px" }}>
            <label
              htmlFor="reset-new-password"
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              New password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reset-new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "10px 40px 10px 14px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                  transition: "border-color var(--transition)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-subtle)",
                  padding: 0,
                  lineHeight: 0,
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: "24px" }}>
            <label
              htmlFor="reset-confirm-password"
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Confirm new password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reset-confirm-password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter new password"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: `1px solid ${
                    confirmPassword && confirmPassword !== newPassword
                      ? "var(--accent-orange)"
                      : "var(--border)"
                  }`,
                  padding: "10px 40px 10px 14px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                  transition: "border-color var(--transition)",
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-subtle)",
                  padding: 0,
                  lineHeight: 0,
                }}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--accent-orange)",
                  marginTop: "5px",
                }}
              >
                Passwords do not match.
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !otpComplete}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: "8px",
              backgroundColor: otpComplete ? "var(--primary)" : "var(--surface-2)",
              color: "var(--text)",
              fontSize: "0.9rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background-color 200ms ease",
              opacity: submitting ? 0.8 : 1,
              cursor: otpComplete && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Resetting…
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        {/* Resend section */}
        <div
          style={{
            marginTop: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            width: "100%",
          }}
        >
          <p style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
            Didn&apos;t receive the code?
          </p>
          <button
            onClick={handleResend}
            disabled={!canResend || resending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 500,
              color: canResend ? "var(--cyan-highlight)" : "var(--text-subtle)",
              cursor: canResend && !resending ? "pointer" : "not-allowed",
              padding: "6px 12px",
              borderRadius: "6px",
              border: `1px solid ${canResend ? "rgba(0,229,255,0.25)" : "var(--border)"}`,
              backgroundColor: canResend ? "rgba(0,229,255,0.05)" : "transparent",
              transition: "all 150ms ease",
            }}
          >
            {resending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
            {canResend
              ? resending
                ? "Sending…"
                : "Resend code"
              : `Resend in ${countdown}s`}
          </button>
        </div>

        {/* Back to login */}
        <p
          style={{
            marginTop: "24px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          <Link
            href="/login"
            style={{ color: "var(--cyan-highlight)", textDecoration: "none", fontWeight: 500 }}
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
