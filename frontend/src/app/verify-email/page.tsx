"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { authApi, getErrorMessage } from "@/lib/api";
import axios from "axios";
import { OtpInput } from "@/components/ui/OtpInput";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  // OTP state
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));

  // UI state
  const [verifying, setVerifying] = useState(false);
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
  // Submit verification
  // ---------------------------------------------------------------------------

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < OTP_LENGTH) {
      toast.error("Please enter all 6 digits.");
      return;
    }
    setVerifying(true);
    try {
      await authApi.verifyEmail({ email, otp });
      toast.success("Email verified successfully! You can now log in.");
      router.push("/login");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = err.response?.data?.detail ?? "Verification failed.";
        if (status === 409) toast.error("Your email is already verified. Please log in.");
        else if (status === 429) toast.error(detail);
        else toast.error(detail);
      } else {
        toast.error(getErrorMessage(err));
      }
      // Clear digits on failure so user can re-enter
      setDigits(Array(OTP_LENGTH).fill(""));
    } finally {
      setVerifying(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Resend OTP
  // ---------------------------------------------------------------------------

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    try {
      await authApi.resendVerification({ email });
      toast.success("A new verification code has been sent to your email.");
      // Reset countdown
      setCanResend(false);
      setCountdown(RESEND_COOLDOWN);
      setDigits(Array(OTP_LENGTH).fill(""));
      // Restart countdown
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const otpComplete = digits.every((d) => d !== "");

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
          maxWidth: "440px",
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
          <MailCheck size={26} style={{ color: "var(--cyan-highlight)" }} />
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
          Verify your email
        </h1>

        {/* Subtitle */}
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
          We sent a 6-digit code to
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

        {/* OTP Form */}
        <form onSubmit={handleVerify} style={{ width: "100%" }}>
          {/* 6 digit boxes */}
          <div style={{ marginBottom: "28px" }}>
            <OtpInput value={digits} onChange={setDigits} disabled={verifying} />
          </div>

          {/* Verify button */}
          <button
            type="submit"
            disabled={verifying || !otpComplete}
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
              opacity: verifying ? 0.8 : 1,
              cursor: otpComplete && !verifying ? "pointer" : "not-allowed",
            }}
          >
            {verifying ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify Email"
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
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--text-subtle)",
            }}
          >
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
          Wrong account?{" "}
          <Link
            href="/register"
            style={{
              color: "var(--cyan-highlight)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Register again
          </Link>{" "}
          or{" "}
          <Link
            href="/login"
            style={{
              color: "var(--cyan-highlight)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "var(--bg-base, #0d0f14)" }}><Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--cyan-highlight, #22d3ee)" }} /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
