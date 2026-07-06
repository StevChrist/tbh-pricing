"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, CheckCircle, Shield, UserX, Ban, Activity, RefreshCw, Search, Monitor,
  AlertTriangle, Key, Loader2, LogOut, Trash2, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { adminApi, authApi, getErrorMessage } from "@/lib/api";

const PAGE_SIZE = 50;

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

export default function AdminSecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Tab selector: "dashboard" | "sessions" | "events"
  const [activeTab, setActiveTab] = useState<"dashboard" | "sessions" | "events">("dashboard");

  // Security Stats
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Active Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionsOffset, setSessionsOffset] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionSearchUser, setSessionSearchUser] = useState("");
  const [sessionSearchIp, setSessionSearchIp] = useState("");

  // Security Events
  const [events, setEvents] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearchUser, setEventSearchUser] = useState("");
  const [eventSearchIp, setEventSearchIp] = useState("");
  const [eventFilterSeverity, setEventFilterSeverity] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Verify Admin Access
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

  // Fetch security stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminApi.getSecurityStats();
      setStats(res.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async (currentOffset = 0) => {
    setSessionsLoading(true);
    try {
      const res = await adminApi.searchSessions({
        username: sessionSearchUser.trim() || undefined,
        ip_address: sessionSearchIp.trim() || undefined,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });
      setSessions(res.data.sessions);
      setTotalSessions(res.data.total);
      setSessionsOffset(currentOffset);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionSearchUser, sessionSearchIp]);

  // Fetch security events
  const fetchEvents = useCallback(async (currentOffset = 0) => {
    setEventsLoading(true);
    try {
      const res = await adminApi.searchSecurityEvents({
        username: eventSearchUser.trim() || undefined,
        ip_address: eventSearchIp.trim() || undefined,
        severity: eventFilterSeverity || undefined,
        limit: PAGE_SIZE,
        offset: currentOffset,
      });
      setEvents(res.data.events);
      setTotalEvents(res.data.total);
      setEventsOffset(currentOffset);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEventsLoading(false);
    }
  }, [eventSearchUser, eventSearchIp, eventFilterSeverity]);

  // Fetch tab data on activeTab change
  useEffect(() => {
    if (loading) return;
    if (activeTab === "dashboard") {
      fetchStats();
    } else if (activeTab === "sessions") {
      fetchSessions(0);
    } else if (activeTab === "events") {
      fetchEvents(0);
    }
  }, [activeTab, loading, fetchStats, fetchSessions, fetchEvents]);

  // Terminate individual session (Admin)
  const handleTerminateSession = async (sessionId: string, username: string) => {
    const confirm = window.confirm(`Are you sure you want to force terminate session for user @${username}?`);
    if (!confirm) return;

    setActionLoading(sessionId);
    try {
      await adminApi.terminateSessionAdmin(sessionId);
      toast.success(`Force terminated session for @${username}.`);
      await fetchSessions(sessionsOffset);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // Terminate all sessions of a user (Admin)
  const handleTerminateAllUserSessions = async (userId: number, username: string) => {
    const confirm = window.confirm(`Are you sure you want to terminate ALL active sessions for user @${username}? They will be forced to log in again on all devices.`);
    if (!confirm) return;

    setActionLoading(`all-${userId}`);
    try {
      await adminApi.terminateAllUserSessionsAdmin(userId);
      toast.success(`Terminated all active sessions for @${username}.`);
      await fetchSessions(sessionsOffset);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSessionSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions(0);
  };

  const handleEventSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents(0);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column" }}>
        <TopBar />
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <Loader2 className="animate-spin" size={32} style={{ color: "var(--cyan-highlight)" }} />
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Verifying admin access...</p>
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
            Security Center
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
            Enterprise security monitoring, session audits, and threat detection.
          </p>
        </div>

        {/* Tab switcher navigation capsule */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
          <div
            style={{
              display: "flex",
              backgroundColor: "var(--surface)",
              borderRadius: "9999px",
              padding: "4px",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "sessions", label: "Active Sessions" },
              { id: "events", label: "Security Events" },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="tab-btn-hover"
                  style={{
                    padding: "8px 20px",
                    borderRadius: "9999px",
                    border: "none",
                    backgroundColor: active ? "var(--surface-offset)" : "transparent",
                    color: active ? "var(--cyan-highlight)" : "var(--text-muted)",
                    fontSize: "0.85rem",
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 150ms ease",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: SECURITY DASHBOARD */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {statsLoading ? (
              <div style={{ padding: "80px 0", display: "flex", justifyContent: "center" }}>
                <Loader2 className="animate-spin" size={32} style={{ color: "var(--cyan-highlight)" }} />
              </div>
            ) : stats ? (
              <>
                {/* Stats Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                  {[
                    { label: "Today's Logins", value: stats.todays_logins, icon: Activity, color: "#10b981" },
                    { label: "Failed Logins", value: stats.failed_logins, icon: AlertTriangle, color: "#ef4444" },
                    { label: "Password Resets", value: stats.password_resets, icon: Key, color: "#f59e0b" },
                    { label: "New Users Today", value: stats.new_users, icon: Users, color: "var(--cyan-highlight)" },
                    { label: "Suspended Users", value: stats.suspended_users, icon: UserX, color: "#f97316" },
                    { label: "Banned Users", value: stats.banned_users, icon: Ban, color: "#ea580c" },
                    { label: "Security Events Today", value: stats.security_events_today, icon: ShieldAlert, color: "#ef4444" },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="stat-card-hover"
                      style={{
                        padding: "20px 16px",
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
                        <h3 style={{ fontSize: "2rem", fontWeight: 700, margin: "6px 0 0 0", color: "var(--text)" }}>{stat.value}</h3>
                      </div>
                      <div style={{ padding: "10px", borderRadius: "10px", backgroundColor: "var(--surface-offset)", color: stat.color }}>
                        <stat.icon size={22} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Dashboard Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", flexWrap: "wrap" }}>
                  <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 12px 0", color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Activity size={18} style={{ color: "#10b981" }} /> Threat Index
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                      Failed logins today: <span style={{ fontWeight: 600, color: stats.failed_logins > 5 ? "#ef4444" : "var(--text)" }}>{stats.failed_logins}</span>.
                      If failed attempts spike unexpectedly, please verify the network rate limit parameters in settings.
                    </p>
                  </div>
                  <div style={{ padding: "20px", borderRadius: "12px", backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 12px 0", color: "var(--text)", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Shield size={18} style={{ color: "var(--cyan-highlight)" }} /> System Integrity
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
                      Enterprise audits are logged securely. Critical security events today: <span style={{ fontWeight: 600, color: stats.security_events_today > 0 ? "#ef4444" : "var(--text)" }}>{stats.security_events_today}</span>.
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 2: ACTIVE SESSIONS */}
        {activeTab === "sessions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Filter Search Bar */}
            <form
              onSubmit={handleSessionSearchSubmit}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Search User</label>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Username or email..."
                    value={sessionSearchUser}
                    onChange={(e) => setSessionSearchUser(e.target.value)}
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
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>IP Address</label>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="IP address..."
                    value={sessionSearchIp}
                    onChange={(e) => setSessionSearchIp(e.target.value)}
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
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="submit"
                  disabled={sessionsLoading}
                  className="btn-hover-effect"
                  style={{
                    height: "36px",
                    padding: "0 18px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "var(--cyan-highlight)",
                    color: "var(--bg)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: sessionsLoading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {sessionsLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Search
                </button>
              </div>
            </form>

            {/* Sessions Table */}
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
                      <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>User</th>
                      <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Created At</th>
                      <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Last Activity</th>
                      <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>IP Address</th>
                      <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Browser</th>
                      <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>OS</th>
                      <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)" }}>Device</th>
                      <th style={{ padding: "14px 16px", fontWeight: 600, color: "var(--text-muted)", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsLoading ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "36px", textAlign: "center" }}>
                          <Loader2 className="animate-spin" size={24} style={{ color: "var(--cyan-highlight)", display: "inline-block" }} />
                        </td>
                      </tr>
                    ) : sessions.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)" }}>
                          No active sessions found.
                        </td>
                      </tr>
                    ) : (
                      sessions.map((sess) => (
                        <tr key={sess.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600 }}>@{sess.username}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{sess.email}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>{formatTimestamp(sess.created_at)}</td>
                          <td style={{ padding: "14px 16px" }}>{formatTimestamp(sess.last_activity_at)}</td>
                          <td style={{ padding: "14px 16px", fontFamily: "monospace" }}>{sess.ip_address}</td>
                          <td style={{ padding: "14px 16px" }}>{sess.browser}</td>
                          <td style={{ padding: "14px 16px" }}>{sess.os}</td>
                          <td style={{ padding: "14px 16px" }}>{sess.device}</td>
                          <td style={{ padding: "14px 16px", textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                              <button
                                onClick={() => handleTerminateSession(sess.id, sess.username)}
                                disabled={actionLoading !== null}
                                title="Revoke this session"
                                className="btn-hover-effect"
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  backgroundColor: "var(--surface-offset)",
                                  color: "#f87171",
                                  cursor: actionLoading ? "not-allowed" : "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {actionLoading === sess.id ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                                Revoke
                              </button>
                              <button
                                onClick={() => handleTerminateAllUserSessions(sess.user_id, sess.username)}
                                disabled={actionLoading !== null}
                                title="Log out this user everywhere"
                                className="btn-hover-effect"
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid #ef444430",
                                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                                  color: "#ef4444",
                                  cursor: actionLoading ? "not-allowed" : "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: 500,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {actionLoading === `all-${sess.user_id}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                Terminate All
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY EVENTS */}
        {activeTab === "events" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Filter Form */}
            <form
              onSubmit={handleEventSearchSubmit}
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: "16px",
                alignItems: "end",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Search User</label>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Username or email..."
                    value={eventSearchUser}
                    onChange={(e) => setEventSearchUser(e.target.value)}
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
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>IP Address</label>
                <div style={{ position: "relative" }}>
                  <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    placeholder="IP address..."
                    value={eventSearchIp}
                    onChange={(e) => setEventSearchIp(e.target.value)}
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
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>Severity</label>
                <select
                  value={eventFilterSeverity}
                  onChange={(e) => setEventFilterSeverity(e.target.value)}
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
                  <option value="">All Severities</option>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={eventsLoading}
                className="btn-hover-effect"
                style={{
                  height: "36px",
                  padding: "0 18px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "var(--cyan-highlight)",
                  color: "var(--bg)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: eventsLoading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {eventsLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
            </form>

            {/* Events List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {eventsLoading ? (
                <div style={{ padding: "40px 0", display: "flex", justifyContent: "center" }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: "var(--cyan-highlight)" }} />
                </div>
              ) : events.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", color: "var(--text-muted)" }}>
                  No security events recorded matching filters.
                </div>
              ) : (
                events.map((evt) => {
                  const isCritical = evt.severity === "CRITICAL";
                  const isWarning = evt.severity === "WARNING";
                  const sevColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#3b82f6";
                  
                  return (
                    <div
                      key={evt.id}
                      className="security-card-hover"
                      style={{
                        padding: "16px 20px",
                        borderRadius: "12px",
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: "4px",
                            backgroundColor: `${sevColor}15`,
                            color: sevColor,
                            border: `1px solid ${sevColor}30`,
                            textTransform: "uppercase",
                            marginTop: "2px",
                          }}
                        >
                          {evt.severity}
                        </span>
                        <div>
                          <p style={{ fontSize: "0.9rem", fontWeight: 500, margin: 0, color: "var(--text)" }}>
                            {evt.description}
                          </p>
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                            {evt.username ? (
                              <>
                                Target User: <span style={{ color: "var(--text)" }}>@{evt.username} ({evt.email})</span>
                              </>
                            ) : (
                              "System-level event"
                            )}
                            {evt.ip_address && (
                              <>
                                <span style={{ margin: "0 8px" }}>•</span>
                                IP Address: <span style={{ fontFamily: "monospace", color: "var(--text)" }}>{evt.ip_address}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {formatTimestamp(evt.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
