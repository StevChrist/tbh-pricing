"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Trash2, Mail, ShieldAlert, Calendar, Loader2, X, Shield, User as UserIcon, Monitor
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { adminApi, authApi, getErrorMessage } from "@/lib/api";
import type { AdminUser } from "@/types";

// Duration formatter helper
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
}

// Joined date formatter helper
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function UsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);

  // Notify form state
  const [notifyType, setNotifyType] = useState<"alert" | "message" | "notification">("message");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [submittingNotify, setSubmittingNotify] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  // Fetch users & verify admin
  useEffect(() => {
    async function loadData() {
      try {
        const profileRes = await authApi.me();
        if (profileRes.data.role !== "admin") {
          toast.error("Access denied: Admins only.");
          router.push("/");
          return;
        }
        setCurrentUser(profileRes.data);
        const usersRes = await adminApi.listUsers();
        setUsers(usersRes.data);
      } catch (err) {
        toast.error("Authentication failed. Redirecting to login...");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Refresh user list
  const refreshUsers = async () => {
    try {
      const res = await adminApi.listUsers();
      setUsers(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Open delete modal
  const handleDeleteClick = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own admin account.");
      return;
    }
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Confirm delete account
  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setDeletingUser(true);
    try {
      await adminApi.deleteUser(selectedUser.id);
      toast.success(`User '${selectedUser.username}' successfully deleted.`);
      setShowDeleteModal(false);
      setSelectedUser(null);
      refreshUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingUser(false);
    }
  };

  // Open notify modal
  const handleNotifyClick = (user: AdminUser) => {
    setSelectedUser(user);
    setNotifyType("message");
    setNotifyMessage("");
    setShowNotifyModal(true);
  };

  // Confirm send notification
  const handleConfirmNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !notifyMessage.trim()) return;
    setSubmittingNotify(true);
    try {
      await adminApi.sendNotification(selectedUser.id, {
        notify_type: notifyType,
        message: notifyMessage.trim(),
      });
      toast.success(`Notice successfully sent to ${selectedUser.username}.`);
      setShowNotifyModal(false);
      setSelectedUser(null);
      setNotifyMessage("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingNotify(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "var(--text-muted)" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <Loader2 className="animate-spin" size={32} style={{ color: "var(--cyan-highlight)" }} />
            <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Verifying credentials & loading user directory...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
      <TopBar />

      <main
        className="animate-container-slide"
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Page Title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "3.5rem",
              fontWeight: 500,
              textTransform: "uppercase",
              color: "var(--text)",
              letterSpacing: "0.02em",
              textAlign: "center",
              margin: 0,
            }}
          >
            Users Directory
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
            Monitor users, track daily activities, and manage notifications.
          </p>
        </div>

        {/* Users Table */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-offset)" }}>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>User ID</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Username</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Email</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Role</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Joined</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Last IP</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Daily Active</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Inventory Items</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
                      No users registered.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          backgroundColor: isSelf ? "rgba(0, 240, 255, 0.03)" : "transparent",
                          transition: "background-color 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "14px 16px", fontWeight: 500, fontFamily: "monospace" }}>#{user.id}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>{user.username} {isSelf && <span style={{ fontSize: "0.75rem", color: "var(--cyan-highlight)", fontWeight: 500 }}>(You)</span>}</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>{user.email}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              backgroundColor: user.role === "admin" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                              color: user.role === "admin" ? "#ef4444" : "#22c55e",
                              border: user.role === "admin" ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(34, 197, 94, 0.25)",
                            }}
                          >
                            {user.role === "admin" ? <Shield size={10} /> : <UserIcon size={10} />}
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>{formatDate(user.created_at)}</td>
                        <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                          {user.last_ip_address || "—"}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 500 }}>
                          {formatDuration(user.daily_active_seconds)}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                          {user.inventory_count} items
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                            <button
                              onClick={() => handleNotifyClick(user)}
                              title="Send warning / notification"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--surface-offset)",
                                color: "var(--text)",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "var(--cyan-highlight)";
                                e.currentTarget.style.color = "var(--cyan-highlight)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--border)";
                                e.currentTarget.style.color = "var(--text)";
                              }}
                            >
                              <Mail size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(user)}
                              disabled={isSelf}
                              title={isSelf ? "Cannot delete yourself" : "Delete user account"}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "30px",
                                height: "30px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--surface-offset)",
                                color: isSelf ? "rgba(239, 68, 68, 0.4)" : "#ef4444",
                                cursor: isSelf ? "not-allowed" : "pointer",
                                opacity: isSelf ? 0.4 : 1,
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelf) {
                                  e.currentTarget.style.borderColor = "#ef4444";
                                  e.currentTarget.style.backgroundColor = "#ef4444";
                                  e.currentTarget.style.color = "#fff";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelf) {
                                  e.currentTarget.style.borderColor = "var(--border)";
                                  e.currentTarget.style.backgroundColor = "var(--surface-offset)";
                                  e.currentTarget.style.color = "#ef4444";
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Delete User Modal Portal */}
      {showDeleteModal && selectedUser &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
          >
            <div
              className="animate-modal-pop"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                width: "min(400px, 90vw)",
                padding: "24px",
                boxShadow: "var(--shadow-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                  <ShieldAlert size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0" }}>
                    Delete User Account?
                  </h3>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to delete the user account for <strong>{selectedUser.username}</strong>?
                    This action will permanently delete all inventory items, active price alerts, and notifications.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deletingUser}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "transparent",
                    color: "var(--text)",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deletingUser}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {deletingUser ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete User"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Notify User Modal Portal */}
      {showNotifyModal && selectedUser &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
            }}
          >
            <div
              className="animate-modal-pop"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                width: "min(460px, 90vw)",
                padding: "24px",
                boxShadow: "var(--shadow-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                  Send Notice to {selectedUser.username}
                </h3>
                <button
                  onClick={() => setShowNotifyModal(false)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmNotify} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Notice Type Selector */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Notice Type</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    {[
                      { value: "message", label: "Inbox Message", desc: "Mailbox" },
                      { value: "notification", label: "Notification", desc: "Toast popup" },
                      { value: "alert", label: "Critical Alert", desc: "Modal warning" },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setNotifyType(type.value as any)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "2px",
                          padding: "10px",
                          borderRadius: "8px",
                          border: notifyType === type.value ? "1.5px solid var(--cyan-highlight)" : "1px solid var(--border)",
                          backgroundColor: notifyType === type.value ? "rgba(0,240,255,0.04)" : "var(--surface-offset)",
                          color: notifyType === type.value ? "var(--cyan-highlight)" : "var(--text)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{type.label}</span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message input */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Message Content</label>
                  <textarea
                    required
                    rows={4}
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder="Tulis pesan atau peringatan untuk pengguna ini..."
                    style={{
                      width: "100%",
                      backgroundColor: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      color: "var(--text)",
                      fontFamily: "var(--font-body)",
                      fontSize: "0.85rem",
                      resize: "none",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setShowNotifyModal(false)}
                    disabled={submittingNotify}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      backgroundColor: "transparent",
                      color: "var(--text)",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingNotify || !notifyMessage.trim()}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "var(--cyan-highlight)",
                      color: "#000",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {submittingNotify ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Notice"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
