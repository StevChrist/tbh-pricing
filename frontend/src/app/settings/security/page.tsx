"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield, Key, Monitor, Clock, ShieldAlert, LogOut, CheckCircle, AlertTriangle, XCircle, Search, RefreshCw, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { authApi, getErrorMessage } from "@/lib/api";

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

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSecurityData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [sessRes, histRes, eventsRes] = await Promise.all([
        authApi.getSessions(),
        authApi.getLoginHistory(),
        authApi.getSecurityEvents(),
      ]);
      setSessions(sessRes.data);
      setLoginHistory(histRes.data);
      setSecurityEvents(eventsRes.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function initPage() {
      try {
        await authApi.me(); // Verify auth
        await fetchSecurityData();
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    initPage();
  }, [router, fetchSecurityData]);

  const handleTerminateSession = async (sessionId: string, isCurrent: boolean) => {
    if (isCurrent) {
      const confirm = window.confirm(
        "Are you sure you want to terminate your current session? You will be logged out immediately."
      );
      if (!confirm) return;
    } else {
      const confirm = window.confirm("Are you sure you want to terminate this session on another device?");
      if (!confirm) return;
    }

    setActionLoading(sessionId);
    try {
      await authApi.terminateSession(sessionId);
      toast.success("Session terminated successfully.");
      if (isCurrent) {
        router.push("/login");
      } else {
        await fetchSecurityData();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleTerminateOthers = async () => {
    const confirm = window.confirm("Are you sure you want to terminate all other active sessions? You will stay logged in only on this device.");
    if (!confirm) return;

    setActionLoading("terminate-others");
    try {
      await authApi.terminateOtherSessions();
      toast.success("All other active sessions terminated.");
      await fetchSecurityData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <Loader2 className="animate-spin" size={32} style={{ color: "var(--cyan-highlight)" }} />
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Loading security settings...</p>
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
          gap: "32px",
        }}
      >
        {/* Page Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "2.5rem",
                fontWeight: 500,
                textTransform: "uppercase",
                color: "var(--text)",
                letterSpacing: "0.02em",
                margin: 0,
              }}
            >
              Security Settings
            </h1>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
              Monitor your active sessions, login history logs, and security audit log.
            </p>
          </div>
          <button
            onClick={fetchSecurityData}
            disabled={isRefreshing}
            className="btn-hover-effect"
            style={{
              height: "36px",
              padding: "0 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* ACTIVE SESSIONS */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Monitor size={18} style={{ color: "var(--cyan-highlight)" }} /> Active Sessions
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                These devices are currently logged into your account. Terminate any session you do not recognize.
              </p>
            </div>
            {sessions.length > 1 && (
              <button
                onClick={handleTerminateOthers}
                disabled={actionLoading === "terminate-others"}
                className="btn-hover-effect"
                style={{
                  height: "32px",
                  padding: "0 12px",
                  borderRadius: "6px",
                  border: "1px solid #f8717140",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#f87171",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {actionLoading === "terminate-others" && <Loader2 size={12} className="animate-spin" />}
                Log Out Other Devices
              </button>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="security-card-hover"
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  backgroundColor: "var(--surface-offset)",
                  border: sess.is_current ? "1px solid var(--cyan-highlight)" : "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ padding: "10px", borderRadius: "8px", backgroundColor: "var(--surface)", color: sess.is_current ? "var(--cyan-highlight)" : "var(--text-muted)" }}>
                    <Monitor size={20} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        {sess.browser} on {sess.os}
                      </span>
                      {sess.is_current && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            backgroundColor: "rgba(6, 182, 212, 0.15)",
                            color: "var(--cyan-highlight)",
                            border: "1px solid rgba(6, 182, 212, 0.3)",
                          }}
                        >
                          THIS DEVICE
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                      IP Address: <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{sess.ip_address}</span>
                      <span style={{ margin: "0 8px" }}>•</span>
                      Last active: {formatTimestamp(sess.last_activity_at)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleTerminateSession(sess.id, sess.is_current)}
                  disabled={actionLoading !== null}
                  className="btn-hover-effect"
                  style={{
                    height: "32px",
                    padding: "0 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface)",
                    color: sess.is_current ? "#f87171" : "var(--text)",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {actionLoading === sess.id && <Loader2 size={12} className="animate-spin" />}
                  {sess.is_current ? "Log Out" : "Revoke Access"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* LOGIN HISTORY */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Clock size={18} style={{ color: "var(--cyan-highlight)" }} /> Recent Login History
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
              Audit log of logins from the last 50 attempts.
            </p>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--surface-offset)" }}>
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)" }}>Timestamp</th>
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)" }}>IP Address</th>
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)" }}>Browser</th>
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)" }}>OS</th>
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)" }}>Device</th>
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)" }}>Status</th>
                    <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)" }}>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                        No login history found.
                      </td>
                    </tr>
                  ) : (
                    loginHistory.map((hist) => {
                      const isSuccess = hist.result === "SUCCESS";
                      const statusColor = isSuccess ? "#22c55e" : "#ef4444";
                      const statusBg = isSuccess ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
                      
                      return (
                        <tr key={hist.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "12px 14px" }}>{formatTimestamp(hist.timestamp)}</td>
                          <td style={{ padding: "12px 14px", fontFamily: "monospace" }}>{hist.ip_address}</td>
                          <td style={{ padding: "12px 14px" }}>{hist.browser || "Unknown"}</td>
                          <td style={{ padding: "12px 14px" }}>{hist.os || "Unknown"}</td>
                          <td style={{ padding: "12px 14px" }}>{hist.device || "Unknown"}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: statusBg,
                                color: statusColor,
                                textTransform: "uppercase",
                              }}
                            >
                              {hist.status}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>
                            {hist.reason ? hist.reason.replace("_", " ") : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SECURITY EVENTS */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldAlert size={18} style={{ color: "var(--cyan-highlight)" }} /> Security Audit Events
            </h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
              Audit logs of password changes, verification events, and logins.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {securityEvents.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "20px" }}>
                No security audit events recorded.
              </p>
            ) : (
              securityEvents.map((evt) => {
                const isCritical = evt.severity === "CRITICAL";
                const isWarning = evt.severity === "WARNING";
                const iconColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#3b82f6";
                const icon = isCritical ? XCircle : isWarning ? AlertTriangle : CheckCircle;
                const IconComponent = icon;

                return (
                  <div
                    key={evt.id}
                    className="security-card-hover"
                    style={{
                      padding: "12px 16px",
                      borderRadius: "8px",
                      backgroundColor: "var(--surface-offset)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ color: iconColor, display: "flex", alignItems: "center" }}>
                        <IconComponent size={16} />
                      </span>
                      <div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{evt.description}</span>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                          IP: <span style={{ fontFamily: "monospace" }}>{evt.ip_address || "Unknown"}</span>
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {formatTimestamp(evt.timestamp)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
