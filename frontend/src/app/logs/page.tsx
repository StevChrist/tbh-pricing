"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Activity, Search, Filter, Loader2, Calendar, ChevronLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { adminApi, authApi, getErrorMessage } from "@/lib/api";
import type { ActivityLog } from "@/types";

const LOG_LIMIT = 50;

// Action badges styling helper
function getActionBadgeStyle(action: string) {
  let bg = "rgba(156, 163, 175, 0.15)";
  let color = "#9ca3af";
  
  if (action.startsWith("login_success") || action.startsWith("register")) {
    bg = "rgba(34, 197, 94, 0.15)";
    color = "#22c55e";
  } else if (action.startsWith("login_failure") || action === "delete_user" || action === "delete_account") {
    bg = "rgba(239, 68, 68, 0.15)";
    color = "#ef4444";
  } else if (action === "add_item" || action === "bulk_add_item") {
    bg = "rgba(59, 130, 246, 0.15)";
    color = "#3b82f6";
  } else if (action === "edit_item" || action === "edit_alert") {
    bg = "rgba(245, 158, 11, 0.15)";
    color = "#f59e0b";
  } else if (action === "delete_item" || action === "delete_alert" || action === "bulk_delete_item") {
    bg = "rgba(236, 72, 153, 0.15)";
    color = "#ec4899";
  } else if (action === "send_notification") {
    bg = "rgba(168, 85, 247, 0.15)";
    color = "#a855f7";
  } else if (action === "set_alert") {
    bg = "rgba(6, 182, 212, 0.15)";
    color = "#06b6d4";
  }

  return {
    display: "inline-block",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    padding: "2px 8px",
    borderRadius: "4px",
    backgroundColor: bg,
    color: color,
    border: `1px solid ${color}40`,
  };
}

// Timestamp formatter helper
function formatTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export default function LogsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [offset, setOffset] = useState(0);

  // Filters state
  const [searchUser, setSearchUser] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Verify admin access
  useEffect(() => {
    async function checkAccess() {
      try {
        const { data } = await authApi.me();
        if (data.role !== "admin") {
          toast.error("Access denied: Admins only.");
          router.push("/");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAccess();
  }, [router]);

  // Fetch logs callback
  const fetchLogs = useCallback(async (currentOffset = 0) => {
    setFetchingLogs(true);
    try {
      const res = await adminApi.listLogs({
        username: searchUser.trim() || undefined,
        action: selectedAction || undefined,
        limit: LOG_LIMIT,
        offset: currentOffset,
      });
      setLogs(res.data.logs);
      setTotalLogs(res.data.total);
      setOffset(currentOffset);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setFetchingLogs(false);
    }
  }, [searchUser, selectedAction]);

  // Fetch logs on filter changes
  useEffect(() => {
    if (!loading) {
      fetchLogs(0);
    }
  }, [loading, selectedAction, fetchLogs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(0);
  };

  const handlePageChange = (direction: "prev" | "next") => {
    const nextOffset = direction === "next" ? offset + LOG_LIMIT : offset - LOG_LIMIT;
    if (nextOffset >= 0 && nextOffset < totalLogs) {
      fetchLogs(nextOffset);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <Loader2 className="animate-spin" size={32} style={{ color: "var(--cyan-highlight)" }} />
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Verifying permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentPage = Math.floor(offset / LOG_LIMIT) + 1;
  const totalPages = Math.max(1, Math.ceil(totalLogs / LOG_LIMIT));

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
            Activity Logs
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
            Audit history of site activities and administration commands. Max retention: 1 week.
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: "16px",
            alignItems: "end",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* User Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Search User</label>
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
              />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Username (e.g. admin)..."
                style={{
                  width: "100%",
                  height: "36px",
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0 12px 0 34px",
                  color: "var(--text)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
          </form>

          {/* Action Filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Action Type</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              style={{
                width: "100%",
                height: "36px",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0 12px",
                color: "var(--text)",
                fontSize: "0.85rem",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="">All Actions</option>
              <option value="login_success">Login Success</option>
              <option value="login_failure">Login Failure</option>
              <option value="register_success">Register Success</option>
              <option value="add_item">Add Item</option>
              <option value="edit_item">Edit Item</option>
              <option value="delete_item">Delete Item</option>
              <option value="bulk_add_item">Bulk Add Item</option>
              <option value="bulk_delete_item">Bulk Delete Item</option>
              <option value="set_alert">Create Alert</option>
              <option value="edit_alert">Edit Alert</option>
              <option value="delete_alert">Delete Alert</option>
              <option value="send_notification">Send Notification</option>
              <option value="delete_user">Delete User</option>
            </select>
          </div>

          {/* Refresh / Submit */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => fetchLogs(offset)}
              disabled={fetchingLogs}
              title="Refresh logs"
              style={{
                height: "36px",
                padding: "0 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RefreshCw size={14} className={fetchingLogs ? "animate-spin" : ""} />
            </button>
            <button
              onClick={handleSearchSubmit}
              disabled={fetchingLogs}
              style={{
                height: "36px",
                padding: "0 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "var(--cyan-highlight)",
                color: "#000",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Apply Filter
            </button>
          </div>
        </div>

        {/* Logs Table */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {fetchingLogs && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0,0,0,0.15)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <Loader2 className="animate-spin" size={24} style={{ color: "var(--cyan-highlight)" }} />
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-offset)" }}>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)", width: "180px" }}>Timestamp</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)", width: "130px" }}>Username</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)", width: "120px" }}>IP Address</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)", width: "150px" }}>Action</th>
                  <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                      <Activity size={28} style={{ color: "var(--text-subtle)", marginBottom: "8px" }} />
                      <p style={{ fontWeight: 500, margin: 0 }}>No matching logs found.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--surface-offset)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <td style={{ padding: "14px 16px", color: "var(--text-muted)" }}>{formatTimestamp(log.created_at)}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 600 }}>{log.username || "System / Guest"}</td>
                      <td style={{ padding: "14px 16px", fontFamily: "monospace", color: "var(--text-muted)" }}>{log.ip_address || "—"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={getActionBadgeStyle(log.action)}>{log.action}</span>
                      </td>
                      <td style={{ padding: "14px 16px", color: "var(--text)", lineHeight: 1.4 }}>{log.details || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                padding: "14px 16px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "var(--surface-offset)",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Showing <strong>{offset + 1}</strong> to <strong>{Math.min(offset + LOG_LIMIT, totalLogs)}</strong> of <strong>{totalLogs}</strong> logs
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => handlePageChange("prev")}
                  disabled={offset === 0 || fetchingLogs}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    backgroundColor: offset === 0 ? "transparent" : "var(--surface)",
                    color: offset === 0 ? "var(--text-subtle)" : "var(--text)",
                    cursor: offset === 0 ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                <span style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange("next")}
                  disabled={offset + LOG_LIMIT >= totalLogs || fetchingLogs}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    backgroundColor: offset + LOG_LIMIT >= totalLogs ? "transparent" : "var(--surface)",
                    color: offset + LOG_LIMIT >= totalLogs ? "var(--text-subtle)" : "var(--text)",
                    cursor: offset + LOG_LIMIT >= totalLogs ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  Next
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
