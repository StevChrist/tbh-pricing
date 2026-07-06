import { useState, useEffect, useRef } from "react";
import { X, ShieldAlert, Check, Loader2, RefreshCw } from "lucide-react";
import { authApi, getErrorMessage } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { OtpInput } from "@/components/ui/OtpInput";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: any;
  onUserUpdate?: (updatedUser: any) => void;
}

export function ProfileModal({ open, onClose, user, onUserUpdate }: ProfileModalProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Edit Username / Email States
  const [newUsername, setNewUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailStep, setEmailStep] = useState(1); // 1 = Request code, 2 = Verify OTP code
  const [emailOtp, setEmailOtp] = useState<string[]>(Array(6).fill(""));
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [isRequestingEmail, setIsRequestingEmail] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailCountdown, setEmailCountdown] = useState(60);
  const [emailCanResend, setEmailCanResend] = useState(false);
  const [emailResending, setEmailResending] = useState(false);

  // Secure Delete Account State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1 = Password verification, 2 = OTP verification
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteOtp, setDeleteOtp] = useState<string[]>(Array(6).fill(""));
  const [deleteError, setDeleteError] = useState("");
  const [isRequestingDelete, setIsRequestingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Resend Countdown State
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  // Reset Delete Account States on Close
  const handleClose = () => {
    setConfirmDelete(false);
    setDeleteStep(1);
    setDeletePassword("");
    setDeleteOtp(Array(6).fill(""));
    setDeleteError("");
    setCountdown(60);
    setCanResend(false);

    // Reset username/email states
    setNewUsername("");
    setUsernameError("");
    setUsernameSuccess(false);
    setNewEmail("");
    setEmailStep(1);
    setEmailOtp(Array(6).fill(""));
    setEmailError("");
    setEmailSuccess(false);
    setEmailCountdown(60);
    setEmailCanResend(false);

    onClose();
  };

  // Cooldown countdown timer for Account Deletion
  useEffect(() => {
    if (deleteStep === 2 && countdown > 0) {
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
    }
  }, [deleteStep, countdown]);

  // Email change OTP countdown timer
  useEffect(() => {
    if (emailStep === 2 && emailCountdown > 0) {
      const interval = setInterval(() => {
        setEmailCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setEmailCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [emailStep, emailCountdown]);

  // Request deletion code
  async function handleRequestDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setIsRequestingDelete(true);
    try {
      await authApi.requestAccountDeletion({ password: deletePassword });
      toast.success("Verification code sent to your email.");
      setDeleteStep(2);
      setCountdown(60);
      setCanResend(false);
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setIsRequestingDelete(false);
    }
  }

  // Perform permanent deletion
  async function handleConfirmDelete(e: React.FormEvent) {
    e.preventDefault();
    const otp = deleteOtp.join("");
    if (otp.length < 6) {
      setDeleteError("Please enter all 6 digits of the verification code.");
      return;
    }
    setDeleteError("");
    setIsDeleting(true);
    try {
      await authApi.deleteAccountViaOtp({ otp });
      toast.success("Account deleted successfully.");
      handleClose();
      router.push("/login");
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleteOtp(Array(6).fill(""));
    } finally {
      setIsDeleting(false);
    }
  }

  // Resend OTP
  async function handleResendDeleteOtp() {
    if (!canResend || resending) return;
    setResending(true);
    setDeleteError("");
    try {
      await authApi.resendDeleteOtp();
      toast.success("A new verification code has been sent to your email.");
      setCanResend(false);
      setCountdown(60);
      setDeleteOtp(Array(6).fill(""));
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }
  // ---------------------------------------------------------------------------
  // Change Username
  // ---------------------------------------------------------------------------
  async function handleUpdateUsername(e: React.FormEvent) {
    e.preventDefault();
    setUsernameError("");
    setUsernameSuccess(false);

    if (!newUsername.trim()) {
      setUsernameError("Username cannot be empty.");
      return;
    }

    if (newUsername.trim() === user?.username) {
      setUsernameError("New username must be different from current.");
      return;
    }

    const confirmChange = window.confirm(`Apakah Anda yakin ingin mengganti username menjadi '${newUsername}'?`);
    if (!confirmChange) return;

    setIsUpdatingUsername(true);
    try {
      await authApi.changeUsername({ new_username: newUsername.trim() });
      toast.success("Username updated successfully.");
      setUsernameSuccess(true);
      
      // Refresh user profile
      const res = await authApi.me();
      if (onUserUpdate) onUserUpdate(res.data);
      setNewUsername("");
    } catch (err) {
      setUsernameError(getErrorMessage(err));
    } finally {
      setIsUpdatingUsername(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Change Email
  // ---------------------------------------------------------------------------
  async function handleRequestEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess(false);
    
    if (!newEmail.trim()) {
      setEmailError("Email cannot be empty.");
      return;
    }

    if (newEmail.trim() === user?.email) {
      setEmailError("New email must be different from current.");
      return;
    }

    setIsRequestingEmail(true);
    try {
      await authApi.requestEmailChange({ new_email: newEmail.trim() });
      toast.success("Verification code sent to your new email.");
      setEmailStep(2);
      setEmailCountdown(60);
      setEmailCanResend(false);
      setEmailOtp(Array(6).fill(""));
    } catch (err) {
      setEmailError(getErrorMessage(err));
    } finally {
      setIsRequestingEmail(false);
    }
  }

  async function handleConfirmEmailChange(e: React.FormEvent) {
    e.preventDefault();
    const otp = emailOtp.join("");
    if (otp.length < 6) {
      setEmailError("Please enter all 6 digits.");
      return;
    }
    setEmailError("");
    setIsUpdatingEmail(true);
    try {
      await authApi.changeEmail({ new_email: newEmail.trim(), otp });
      toast.success("Email updated successfully.");
      setEmailSuccess(true);
      setEmailStep(1);
      setNewEmail("");
      setEmailOtp(Array(6).fill(""));
      
      // Refresh user profile
      const res = await authApi.me();
      if (onUserUpdate) onUserUpdate(res.data);
    } catch (err) {
      setEmailError(getErrorMessage(err));
      setEmailOtp(Array(6).fill(""));
    } finally {
      setIsUpdatingEmail(false);
    }
  }

  async function handleResendEmailOtp() {
    if (!emailCanResend || emailResending) return;
    setEmailResending(true);
    setEmailError("");
    try {
      await authApi.requestEmailChange({ new_email: newEmail.trim() });
      toast.success("A new verification code has been sent.");
      setEmailCanResend(false);
      setEmailCountdown(60);
      setEmailOtp(Array(6).fill(""));
    } catch (err) {
      setEmailError(getErrorMessage(err));
    } finally {
      setEmailResending(false);
    }
  }

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
            onClick={handleClose} 
            style={{ color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "80vh", overflowY: "auto" }}>
          {/* Details (Static view) */}
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
              <span style={{ color: "var(--text-muted)" }}>Current Username:</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{user?.username ?? "-"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Current Email:</span>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>
                {user ? maskEmail(user.email) : "-"}
              </span>
            </div>
          </div>

          {/* Edit Username */}
          <form onSubmit={handleUpdateUsername} style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Change Username
            </h3>

            {usernameSuccess && (
              <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#22c55e", fontSize: "0.8125rem" }}>
                Username updated successfully.
              </div>
            )}

            {usernameError && (
              <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171", fontSize: "0.8125rem" }}>
                {usernameError}
              </div>
            )}

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  New Username
                </label>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Changes remaining: {Math.max(0, 1 - (user?.username_changes_count ?? 0))}/1
                </span>
              </div>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
                disabled={isUpdatingUsername || (user?.username_changes_count ?? 0) >= 1}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                  opacity: (user?.username_changes_count ?? 0) >= 1 ? 0.6 : 1,
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingUsername || (user?.username_changes_count ?? 0) >= 1 || !newUsername.trim()}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                backgroundColor: (user?.username_changes_count ?? 0) >= 1 ? "var(--surface-2)" : "var(--primary)",
                color: "var(--text)",
                fontSize: "0.875rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: (user?.username_changes_count ?? 0) >= 1 ? "not-allowed" : "pointer",
                opacity: (user?.username_changes_count ?? 0) >= 1 ? 0.6 : 1,
              }}
            >
              {isUpdatingUsername && <Loader2 size={14} className="animate-spin" />}
              Change Username
            </button>
          </form>

          {/* Edit Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Change Email
            </h3>

            {emailSuccess && (
              <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.2)", color: "#22c55e", fontSize: "0.8125rem" }}>
                Email updated successfully.
              </div>
            )}

            {emailError && (
              <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171", fontSize: "0.8125rem" }}>
                {emailError}
              </div>
            )}

            {emailStep === 1 ? (
              <form onSubmit={handleRequestEmailChange} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    New Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    disabled={isRequestingEmail}
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
                  disabled={isRequestingEmail || !newEmail.trim()}
                  style={{
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
                  {isRequestingEmail && <Loader2 size={14} className="animate-spin" />}
                  Send Verification Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmailChange} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4, margin: 0 }}>
                  We sent a 6-digit verification code to <strong style={{ color: "var(--cyan-highlight)" }}>{newEmail}</strong>.
                </p>
                
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                    Enter Code
                  </label>
                  <OtpInput value={emailOtp} onChange={setEmailOtp} disabled={isUpdatingEmail} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                  <button
                    type="submit"
                    disabled={isUpdatingEmail || emailOtp.some(d => d === "")}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      backgroundColor: emailOtp.every(d => d !== "") ? "var(--primary)" : "var(--surface-2)",
                      color: "var(--text)",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      cursor: emailOtp.every(d => d !== "") && !isUpdatingEmail ? "pointer" : "not-allowed",
                    }}
                  >
                    {isUpdatingEmail && <Loader2 size={14} className="animate-spin" />}
                    Confirm Email Change
                  </button>

                  <div style={{ display: "flex", justifyContent: "center", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={handleResendEmailOtp}
                      disabled={!emailCanResend || emailResending}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: emailCanResend ? "var(--cyan-highlight)" : "var(--text-subtle)",
                        cursor: emailCanResend && !emailResending ? "pointer" : "not-allowed",
                        background: "none",
                        border: "none",
                      }}
                    >
                      {emailResending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {emailCanResend ? "Resend code" : `Resend in ${emailCountdown}s`}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEmailStep(1)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                      color: "var(--text)",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      marginTop: "4px",
                    }}
                  >
                    Back / Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Reset Password */}
          <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
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

          {/* Security Center Settings Shortcut */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Account Security
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4", margin: 0 }}>
              Manage active sessions on other devices, view login history logs, and review security events.
            </p>
            <button
              type="button"
              onClick={() => {
                handleClose();
                router.push("/settings/security");
              }}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 150ms ease",
              }}
            >
              Go to Security Settings
            </button>
          </div>

          {/* Delete Account */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>
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
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                  This action is permanent and cannot be undone. All your settings, notifications, and price alerts will be permanently lost.
                </p>

                {deleteError && (
                  <p style={{ fontSize: "0.75rem", color: "#f87171", wordBreak: "break-word" }}>
                    {deleteError}
                  </p>
                )}

                {deleteStep === 1 ? (
                  <form onSubmit={handleRequestDelete} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.6875rem", color: "#f87171", marginBottom: "4px" }}>
                        Enter your password to request deletion code
                      </label>
                      <input
                        type="password"
                        required
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="••••••••"
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
                          setDeletePassword("");
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
                        type="submit"
                        disabled={isRequestingDelete || !deletePassword}
                        style={{
                          flex: 1,
                          padding: "6px",
                          borderRadius: "6px",
                          backgroundColor: "#ef4444",
                          color: "var(--text)",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: !deletePassword || isRequestingDelete ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          opacity: !deletePassword || isRequestingDelete ? 0.7 : 1,
                        }}
                      >
                        {isRequestingDelete && <Loader2 size={12} className="animate-spin" />}
                        Continue
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmDelete} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.6875rem", color: "#f87171", marginBottom: "6px", textAlign: "center" }}>
                        Enter the 6-digit code sent to your email
                      </label>
                      
                      {/* OTP inputs */}
                      <div style={{ marginBottom: "12px" }}>
                        <OtpInput value={deleteOtp} onChange={setDeleteOtp} disabled={isDeleting} error={!!deleteError} />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={handleResendDeleteOtp}
                        disabled={!canResend || resending}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          color: canResend ? "var(--cyan-highlight)" : "var(--text-subtle)",
                          cursor: canResend && !resending ? "pointer" : "not-allowed",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          border: `1px solid ${canResend ? "rgba(0,229,255,0.25)" : "var(--border)"}`,
                          backgroundColor: canResend ? "rgba(0,229,255,0.05)" : "transparent",
                          transition: "all 150ms ease",
                        }}
                      >
                        {resending ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                        {canResend
                          ? resending
                            ? "Sending..."
                            : "Resend code"
                          : `Resend in ${countdown}s`}
                      </button>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteStep(1);
                          setDeletePassword("");
                          setDeleteOtp(Array(6).fill(""));
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
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isDeleting || !deleteOtp.every(d => d)}
                        style={{
                          flex: 1,
                          padding: "6px",
                          borderRadius: "6px",
                          backgroundColor: "#ef4444",
                          color: "var(--text)",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: isDeleting || !deleteOtp.every(d => d) ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          opacity: isDeleting || !deleteOtp.every(d => d) ? 0.7 : 1,
                        }}
                      >
                        {isDeleting && <Loader2 size={12} className="animate-spin" />}
                        Confirm Delete
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
