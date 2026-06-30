"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authApi, getErrorMessage } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await authApi.register({ username, email, password });
      toast.success("Account created successfully!");
      router.push("/");
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
          padding: "32px",
          boxShadow: "0 0 50px var(--glow-color)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 229, 255, 0.08)",
            border: "1px solid rgba(0, 229, 255, 0.25)",
            marginBottom: "16px",
          }}
        >
          <Package size={24} style={{ color: "var(--cyan-highlight)" }} />
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 500,
            color: "var(--text)",
            textAlign: "center",
            marginBottom: "4px",
          }}
        >
          TBH Price Tracker
        </h1>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          Create your account
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
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

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter email"
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

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
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
              marginTop: "8px",
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
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Register"}
          </button>
        </form>

        {/* Login Link */}
        <p
          style={{
            marginTop: "24px",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Have account?{" "}
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
