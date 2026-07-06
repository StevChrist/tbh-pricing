"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authApi, getErrorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      toast.success("If the account exists, a reset code has been sent to your email.");
      // Redirect to reset page so user can enter OTP + new password
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: "400px",
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
          <KeyRound size={26} style={{ color: "var(--cyan-highlight)" }} />
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
          Forgot password?
        </h1>

        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            textAlign: "center",
            marginBottom: "28px",
            lineHeight: 1.6,
          }}
        >
          Enter your account email and we&apos;ll send you a 6-digit reset code.
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label
              htmlFor="forgot-email"
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Email address
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              style={{
                width: "100%",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                padding: "10px 14px",
                fontSize: "0.875rem",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                outline: "none",
                transition: "border-color var(--transition)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "4px",
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              backgroundColor: "var(--primary)",
              color: "var(--text)",
              fontSize: "0.875rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "background-color var(--transition)",
              opacity: loading ? 0.8 : 1,
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Reset Code"}
          </button>
        </form>

        {/* Back to login */}
        <p
          style={{
            marginTop: "24px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Remember your password?{" "}
          <Link
            href="/login"
            style={{ color: "var(--cyan-highlight)", textDecoration: "none", fontWeight: 500 }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
