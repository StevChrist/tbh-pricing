"use client";

import { useState } from "react";
import { X, ShieldAlert, Check, Loader2 } from "lucide-react";
import { authApi, getErrorMessage } from "@/lib/api";
import { useRouter } from "next/navigation";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: { username: string; email: string } | null;
}

export function ProfileModal({ open, onClose, user }: ProfileModalProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!open) return null;

  function maskEmail(email: string) {
    if (!email) return "";
    const [local, domain] = email.split("@");
    if (!domain) return email;
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError("");
    setResetSuccess(false);

    if (newPassword !== confirmPassword) {
      setResetError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }

    setIsResetting(true);
    try {
      await authApi.resetPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setResetSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setResetError(getErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmationText !== user?.username) {
      setDeleteError(`Please type "${user?.username}" to confirm deletion.`);
      return;
    }

    setDeleteError("");
    setIsDeleting(true);
    try {
      await authApi.deleteAccount();
      onClose();
      router.push("/login");
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setIsDeleting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div 
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--text)" }}>
            Profile Settings
          </h2>
          <button 
            onClick={onClose} 
            style={{ color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "80vh", overflowY: "auto" }}>
          {/* Details */}
          <div
            style={{
              padding: "14px",
              borderRadius: "8px",
              backgroundColor: "var(--surface-offset)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "0.875rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Username:</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{user?.username ?? "-"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Email:</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>
                {user ? maskEmail(user.email) : "-"}
              </span>
            </div>
          </div>

          {/* Reset Password */}
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Change Password
            </h3>
            
            {resetSuccess && (
              <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#22c55e", fontSize: "0.8125rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <Check size={14} />
                <span>Password changed successfully.</span>
              </div>
            )}

            {resetError && (
              <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171", fontSize: "0.8125rem" }}>
                {resetError}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isResetting}
              style={{
                marginTop: "4px",
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                backgroundColor: "var(--primary)",
                color: "var(--text)",
                fontSize: "0.875rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              {isResetting && <Loader2 size={14} className="animate-spin" />}
              Change Password
            </button>
          </form>

          {/* Delete Account */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldAlert size={14} /> Danger Zone
            </h3>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Delete Account
              </button>
            ) : (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                  This action is irreversible. All items, alerts, and settings will be permanently lost.
                </p>

                {deleteError && (
                  <p style={{ fontSize: "0.75rem", color: "#f87171" }}>
                    {deleteError}
                  </p>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "0.6875rem", color: "#f87171", marginBottom: "4px" }}>
                    Type your username <strong style={{ textDecoration: "underline" }}>{user?.username}</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    placeholder={user?.username}
                    style={{
                      width: "100%",
                      borderRadius: "6px",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      backgroundColor: "var(--surface-offset)",
                      color: "var(--text)",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeleteConfirmationText("");
                      setDeleteError("");
                    }}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      backgroundColor: "var(--surface-offset)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteAccount}
                    style={{
                      flex: 1,
                      padding: "6px",
                      borderRadius: "6px",
                      backgroundColor: "#ef4444",
                      color: "var(--text)",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    {isDeleting ? "Deleting..." : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
