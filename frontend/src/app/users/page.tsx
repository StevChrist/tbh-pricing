"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Trash2, Mail, ShieldAlert, Calendar, Loader2, X, Shield, User as UserIcon, Monitor,
  Ban, UserX, LogOut, Key, Filter, Search, Users, CheckCircle, AlertTriangle, Activity, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { adminApi, authApi, getErrorMessage } from "@/lib/api";
import type { AdminUser, AdminStats, UserDetail } from "@/types";

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

  // Stats State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVerified, setFilterVerified] = useState("all");

  // User Detail State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"suspend" | "unsuspend" | "ban" | "unban" | "force-logout" | "force-password-reset" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Notify form state
  const [notifyType, setNotifyType] = useState<"alert" | "message" | "notification">("message");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [submittingNotify, setSubmittingNotify] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [confirmUsername, setConfirmUsername] = useState("");

  // Load and refresh stats and users
  const refreshData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        adminApi.listUsers(),
        adminApi.getStats(),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

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
        const [usersRes, statsRes] = await Promise.all([
          adminApi.listUsers(),
          adminApi.getStats(),
        ]);
        setUsers(usersRes.data);
        setStats(statsRes.data);
      } catch (err) {
        toast.error("Authentication failed. Redirecting to login...");
        router.push("/login");
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    }
    loadData();
  }, [router]);

  // Refresh user list
  const refreshUsers = async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      await refreshData();
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  // Open action confirmation modal
  const handleActionClick = (user: AdminUser, action: typeof confirmAction) => {
    if (user.id === currentUser?.id && (action === "suspend" || action === "ban")) {
      toast.error(`You cannot ${action} yourself.`);
      return;
    }
    setSelectedUser(user);
    setConfirmAction(action);
  };

  // Confirm administrative action
  const handleConfirmAction = async () => {
    if (!selectedUser || !confirmAction) return;
    setActionLoading(true);
    try {
      let res;
      if (confirmAction === "suspend") {
        res = await adminApi.suspendUser(selectedUser.id);
      } else if (confirmAction === "unsuspend") {
        res = await adminApi.unsuspendUser(selectedUser.id);
      } else if (confirmAction === "ban") {
        res = await adminApi.banUser(selectedUser.id);
      } else if (confirmAction === "unban") {
        res = await adminApi.unbanUser(selectedUser.id);
      } else if (confirmAction === "force-logout") {
        res = await adminApi.forceLogout(selectedUser.id);
      } else if (confirmAction === "force-password-reset") {
        res = await adminApi.forcePasswordReset(selectedUser.id);
      }
      toast.success(res?.data.message ?? "Action completed successfully.");
      setConfirmAction(null);
      setSelectedUser(null);
      await refreshData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Row click to lazy-load User Detail Modal
  const handleUserRowClick = async (user: AdminUser, e: React.MouseEvent) => {
    // If clicking an action button, do not trigger row click
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("a") || (e.target as HTMLElement).closest("svg")) {
      return;
    }
    setSelectedUser(user);
    setShowDetailModal(true);
    setLoadingDetail(true);
    setUserDetail(null);
    try {
      const res = await adminApi.getUserDetail(user.id);
      setUserDetail(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
      setShowDetailModal(false);
      setSelectedUser(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open delete modal
  const handleDeleteClick = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own admin account.");
      return;
    }
    setSelectedUser(user);
    setConfirmUsername("");
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
      setConfirmUsername("");
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

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query);

    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    
    let matchesVerified = true;
    if (filterVerified === "verified") {
      matchesVerified = user.email_verified === true;
    } else if (filterVerified === "unverified") {
      matchesVerified = user.email_verified === false;
    }

    return matchesSearch && matchesRole && matchesStatus && matchesVerified;
  });

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

        {/* Statistics Cards */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {[
              { label: "Total Users", value: stats.total_users, icon: Users, color: "var(--cyan-highlight)" },
              { label: "Verified Users", value: stats.verified_users, icon: CheckCircle, color: "#3b82f6" },
              { label: "Administrators", value: stats.admins, icon: Shield, color: "#ef4444" },
              { label: "Suspended Users", value: stats.suspended_users, icon: UserX, color: "#f97316" },
              { label: "Banned Users", value: stats.banned_users, icon: Ban, color: "#ea580c" },
              { label: "Active Today", value: stats.active_today, icon: Activity, color: "#10b981" },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>{stat.label}</span>
                  <h3 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "4px 0 0 0", color: "var(--text)" }}>{stat.value}</h3>
                </div>
                <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: "var(--surface-offset)", color: stat.color }}>
                  <stat.icon size={20} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search & Filters */}
        <div
          style={{
            padding: "16px",
            borderRadius: "12px",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flex: 1, minWidth: "260px", position: "relative" }}>
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Search by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {/* Filter Role */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Role:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  fontSize: "0.8rem",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Filter Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  fontSize: "0.8rem",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
              </select>
            </div>

            {/* Filter Verified */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Verified:</span>
              <select
                value={filterVerified}
                onChange={(e) => setFilterVerified(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  fontSize: "0.8rem",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">All Accounts</option>
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
              </select>
            </div>
          </div>
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
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Status</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Verified</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Joined</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Last Login</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Daily Active</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Items</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser?.id;
                    return (
                      <tr
                        key={user.id}
                        onClick={(e) => handleUserRowClick(user, e)}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          backgroundColor: isSelf ? "rgba(0, 240, 255, 0.03)" : "transparent",
                          cursor: "pointer",
                          transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isSelf ? "rgba(0, 240, 255, 0.05)" : "var(--surface-offset)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = isSelf ? "rgba(0, 240, 255, 0.03)" : "transparent";
                        }}
                      >
                        <td style={{ padding: "14px 16px", fontWeight: 500, fontFamily: "monospace" }}>#{user.id}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                          {user.username} {isSelf && <span style={{ fontSize: "0.75rem", color: "var(--cyan-highlight)", fontWeight: 500 }}>(You)</span>}
                        </td>
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
                              backgroundColor:
                                user.status === "ACTIVE"
                                  ? "rgba(34, 197, 94, 0.12)"
                                  : user.status === "SUSPENDED"
                                  ? "rgba(249, 115, 22, 0.12)"
                                  : "rgba(239, 68, 68, 0.12)",
                              color:
                                user.status === "ACTIVE"
                                  ? "#22c55e"
                                  : user.status === "SUSPENDED"
                                  ? "#f97316"
                                  : "#ef4444",
                              border:
                                user.status === "ACTIVE"
                                  ? "1px solid rgba(34, 197, 94, 0.2)"
                                  : user.status === "SUSPENDED"
                                  ? "1px solid rgba(249, 115, 22, 0.2)"
                                  : "1px solid rgba(239, 68, 68, 0.2)",
                            }}
                          >
                            {user.status === "ACTIVE" ? (
                              <CheckCircle size={10} />
                            ) : user.status === "SUSPENDED" ? (
                              <UserX size={10} />
                            ) : (
                              <Ban size={10} />
                            )}
                            {user.status}
                          </span>
                        </td>
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
                              backgroundColor: user.email_verified ? "rgba(59, 130, 246, 0.12)" : "rgba(239, 68, 68, 0.12)",
                              color: user.email_verified ? "#3b82f6" : "#ef4444",
                              border: user.email_verified ? "1px solid rgba(59, 130, 246, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                            }}
                          >
                            {user.email_verified ? "Verified" : "Unverified"}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>{formatDate(user.created_at)}</td>
                        <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>
                          {user.last_login_at ? formatDate(user.last_login_at) : "—"}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 500 }}>
                          {formatDuration(user.daily_active_seconds)}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                          {user.inventory_count} items
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleNotifyClick(user)}
                              title="Send warning / notification"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "28px",
                                height: "28px",
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
                              <Mail size={12} />
                            </button>

                            {/* Suspend / Unsuspend buttons */}
                            {user.status === "SUSPENDED" ? (
                              <button
                                onClick={() => handleActionClick(user, "unsuspend")}
                                title="Unsuspend user account"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  backgroundColor: "var(--surface-offset)",
                                  color: "#22c55e",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.1)";
                                  e.currentTarget.style.borderColor = "#22c55e";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "var(--surface-offset)";
                                  e.currentTarget.style.borderColor = "var(--border)";
                                }}
                              >
                                <CheckCircle size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActionClick(user, "suspend")}
                                disabled={isSelf}
                                title={isSelf ? "Cannot suspend yourself" : "Suspend user account"}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  backgroundColor: "var(--surface-offset)",
                                  color: isSelf ? "rgba(249, 115, 22, 0.4)" : "#f97316",
                                  cursor: isSelf ? "not-allowed" : "pointer",
                                  opacity: isSelf ? 0.4 : 1,
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelf) {
                                    e.currentTarget.style.backgroundColor = "rgba(249, 115, 22, 0.1)";
                                    e.currentTarget.style.borderColor = "#f97316";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelf) {
                                    e.currentTarget.style.backgroundColor = "var(--surface-offset)";
                                    e.currentTarget.style.borderColor = "var(--border)";
                                  }
                                }}
                              >
                                <UserX size={12} />
                              </button>
                            )}

                            {/* Ban / Unban buttons */}
                            {user.status === "BANNED" ? (
                              <button
                                onClick={() => handleActionClick(user, "unban")}
                                title="Unban user account"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  backgroundColor: "var(--surface-offset)",
                                  color: "#22c55e",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "rgba(34, 197, 94, 0.1)";
                                  e.currentTarget.style.borderColor = "#22c55e";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "var(--surface-offset)";
                                  e.currentTarget.style.borderColor = "var(--border)";
                                }}
                              >
                                <CheckCircle size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActionClick(user, "ban")}
                                disabled={isSelf}
                                title={isSelf ? "Cannot ban yourself" : "Ban user account"}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "28px",
                                  height: "28px",
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
                                    e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                                    e.currentTarget.style.borderColor = "#ef4444";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelf) {
                                    e.currentTarget.style.backgroundColor = "var(--surface-offset)";
                                    e.currentTarget.style.borderColor = "var(--border)";
                                  }
                                }}
                              >
                                <Ban size={12} />
                              </button>
                            )}

                            {/* Force Logout button */}
                            <button
                              onClick={() => handleActionClick(user, "force-logout")}
                              title="Force logout user"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--surface-offset)",
                                color: "#3b82f6",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
                                e.currentTarget.style.borderColor = "#3b82f6";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--surface-offset)";
                                e.currentTarget.style.borderColor = "var(--border)";
                              }}
                            >
                              <LogOut size={12} />
                            </button>

                            {/* Force Password Reset button */}
                            <button
                              onClick={() => handleActionClick(user, "force-password-reset")}
                              title="Force password reset"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                border: "1px solid var(--border)",
                                backgroundColor: "var(--surface-offset)",
                                color: "#eab308",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(234, 179, 8, 0.1)";
                                e.currentTarget.style.borderColor = "#eab308";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--surface-offset)";
                                e.currentTarget.style.borderColor = "var(--border)";
                              }}
                            >
                              <Key size={12} />
                            </button>

                            {/* Delete User button */}
                            <button
                              onClick={() => handleDeleteClick(user)}
                              disabled={isSelf}
                              title={isSelf ? "Cannot delete yourself" : "Delete user account"}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "28px",
                                height: "28px",
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
                              <Trash2 size={12} />
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
                  
                  {/* Safety Username Confirmation Input */}
                  <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>
                      To confirm, type the username <strong style={{ color: "var(--text)" }}>{selectedUser.username}</strong>:
                    </label>
                    <input
                      type="text"
                      value={confirmUsername}
                      onChange={(e) => setConfirmUsername(e.target.value)}
                      placeholder="Type username here"
                      disabled={deletingUser}
                      style={{
                        width: "100%",
                        backgroundColor: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        color: "var(--text)",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    />
                  </div>
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
                  disabled={deletingUser || confirmUsername !== selectedUser.username}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: confirmUsername === selectedUser.username ? "#ef4444" : "var(--surface-2)",
                    color: confirmUsername === selectedUser.username ? "#fff" : "var(--text-muted)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: confirmUsername === selectedUser.username ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: confirmUsername === selectedUser.username ? 1 : 0.6,
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

      {/* Admin Action Confirmation Modal */}
      {confirmAction && selectedUser &&
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
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    backgroundColor:
                      confirmAction === "ban" || confirmAction === "suspend"
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(59, 130, 246, 0.15)",
                    color:
                      confirmAction === "ban" || confirmAction === "suspend"
                        ? "#ef4444"
                        : "#3b82f6",
                  }}
                >
                  <AlertTriangle size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text)", margin: "0 0 4px 0", textTransform: "capitalize" }}>
                    {confirmAction.replace("-", " ")} User?
                  </h3>
                  <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                    Are you sure you want to perform this action on user <strong>{selectedUser.username}</strong>?
                    {confirmAction === "suspend" && " This will invalidate all active sessions and block access until unsuspended."}
                    {confirmAction === "ban" && " This will invalidate all active sessions and permanently block access."}
                    {confirmAction === "force-logout" && " This will immediately invalidate all of the user's active login sessions."}
                    {confirmAction === "force-password-reset" && " This will trigger a reset password link/OTP code sent to their registered email."}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                <button
                  onClick={() => {
                    setConfirmAction(null);
                    setSelectedUser(null);
                  }}
                  disabled={actionLoading}
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
                  onClick={handleConfirmAction}
                  disabled={actionLoading}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor:
                      confirmAction === "ban" || confirmAction === "suspend"
                        ? "#ef4444"
                        : "var(--cyan-highlight)",
                    color:
                      confirmAction === "ban" || confirmAction === "suspend"
                        ? "#fff"
                        : "#000",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Action"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* User Detail lazy-loaded Modal Portal */}
      {showDetailModal && selectedUser &&
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
                width: "min(680px, 95vw)",
                maxHeight: "85vh",
                overflowY: "auto",
                padding: "24px",
                boxShadow: "var(--shadow-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <UserIcon size={20} style={{ color: "var(--cyan-highlight)" }} />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                    User Details: {selectedUser.username}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedUser(null);
                    setUserDetail(null);
                  }}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              {loadingDetail ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "40px 0" }}>
                  <Loader2 className="animate-spin" size={32} style={{ color: "var(--cyan-highlight)" }} />
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Lazy loading user details...</p>
                </div>
              ) : (
                userDetail && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    {/* General info grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                      {[
                        { label: "User ID", value: `#${userDetail.id}` },
                        { label: "Username", value: userDetail.username },
                        { label: "Email Address", value: userDetail.email },
                        { label: "Account Role", value: userDetail.role, isBadge: true, type: "role" },
                        { label: "Account Status", value: userDetail.status, isBadge: true, type: "status" },
                        { label: "Email Status", value: userDetail.email_verified ? "Verified" : "Unverified", isBadge: true, type: "verified" },
                        { label: "Joined Date", value: formatDate(userDetail.created_at) },
                        { label: "Last Login", value: userDetail.last_login_at ? formatDate(userDetail.last_login_at) : "Never" },
                        { label: "Last Active", value: userDetail.last_active_at ? formatDate(userDetail.last_active_at) : "Never" },
                        { label: "Last Known IP", value: userDetail.last_ip_address || "—" },
                        { label: "Inventory Item Count", value: `${userDetail.inventory_count} items` },
                        { label: "Total Login Count", value: `${userDetail.total_login_count} times` },
                      ].map((item, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>{item.label}</span>
                          {item.isBadge ? (
                            <div>
                              <span
                                style={{
                                  display: "inline-flex",
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    item.type === "role"
                                      ? userDetail.role === "admin"
                                        ? "rgba(239, 68, 68, 0.15)"
                                        : "rgba(34, 197, 94, 0.15)"
                                      : item.type === "status"
                                      ? userDetail.status === "ACTIVE"
                                        ? "rgba(34, 197, 94, 0.12)"
                                        : userDetail.status === "SUSPENDED"
                                        ? "rgba(249, 115, 22, 0.12)"
                                        : "rgba(239, 68, 68, 0.12)"
                                      : userDetail.email_verified
                                      ? "rgba(59, 130, 246, 0.12)"
                                      : "rgba(239, 68, 68, 0.12)",
                                  color:
                                    item.type === "role"
                                      ? userDetail.role === "admin"
                                        ? "#ef4444"
                                        : "#22c55e"
                                      : item.type === "status"
                                      ? userDetail.status === "ACTIVE"
                                        ? "#22c55e"
                                        : userDetail.status === "SUSPENDED"
                                        ? "#f97316"
                                        : "#ef4444"
                                      : userDetail.email_verified
                                      ? "#3b82f6"
                                      : "#ef4444",
                                  border:
                                    item.type === "role"
                                      ? userDetail.role === "admin"
                                        ? "1px solid rgba(239, 68, 68, 0.25)"
                                        : "1px solid rgba(34, 197, 94, 0.25)"
                                      : item.type === "status"
                                      ? userDetail.status === "ACTIVE"
                                        ? "1px solid rgba(34, 197, 94, 0.2)"
                                        : userDetail.status === "SUSPENDED"
                                        ? "1px solid rgba(249, 115, 22, 0.2)"
                                        : "1px solid rgba(239, 68, 68, 0.2)"
                                      : userDetail.email_verified
                                      ? "1px solid rgba(59, 130, 246, 0.2)"
                                      : "1px solid rgba(239, 68, 68, 0.2)",
                                }}
                              >
                                {item.value}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{item.value}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Login History Section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                        Recent Login History (Up to 20 Entries)
                      </h4>
                      <div style={{ overflowX: "auto", maxHeight: "180px", border: "1px solid var(--border)", borderRadius: "8px" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                          <thead>
                            <tr style={{ backgroundColor: "var(--surface-offset)", borderBottom: "1px solid var(--border)" }}>
                              <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>Timestamp</th>
                              <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>IP Address</th>
                              <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>Result</th>
                              <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>Browser</th>
                              <th style={{ padding: "8px 12px", color: "var(--text-muted)" }}>Device</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetail.login_history.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ padding: "12px", textAlign: "center", color: "var(--text-muted)" }}>No login logs available.</td>
                              </tr>
                            ) : (
                              userDetail.login_history.map((log) => (
                                <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                  <td style={{ padding: "8px 12px" }}>{new Date(log.timestamp).toLocaleString("id-ID")}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{log.ip_address}</td>
                                  <td style={{ padding: "8px 12px" }}>
                                    <span style={{ color: log.result === "SUCCESS" ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{log.result}</span>
                                  </td>
                                  <td style={{ padding: "8px 12px" }}>{log.browser || "—"}</td>
                                  <td style={{ padding: "8px 12px" }}>{log.device || "—"}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Recent Activities Section */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                        Recent Audit & Activity Logs
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px" }}>
                        {userDetail.recent_activities.length === 0 ? (
                          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>No recent activities found.</p>
                        ) : (
                          userDetail.recent_activities.map((act) => (
                            <div key={act.id} style={{ fontSize: "0.75rem", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                              <div>
                                <strong style={{ color: "var(--cyan-highlight)" }}>{act.action}</strong>
                                <span style={{ color: "var(--text)", marginLeft: "6px" }}>{act.details}</span>
                              </div>
                              <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                {new Date(act.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
