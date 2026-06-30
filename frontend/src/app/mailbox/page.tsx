"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MailOpen, Trash2, CheckCircle2, Loader2,
  X, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { notificationsApi, getErrorMessage } from "@/lib/api";
import { formatIDR, formatUSD } from "@/lib/currency";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { Notification } from "@/types";

export default function MailboxPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.list(filterUnread ? true : undefined);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterUnread]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleToggleExpand = async (notif: Notification) => {
    const isOpening = expandedId !== notif.id;
    setExpandedId(isOpening ? notif.id : null);
    // Auto mark as read when opening
    if (isOpening && !notif.is_read) {
      try {
        await notificationsApi.markRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const deleted = notifications.find((n) => n.id === id);
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deleted && !deleted.is_read) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      if (expandedId === id) setExpandedId(null);
      toast.success("Notification deleted.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteAll = async () => {
    if (notifications.length === 0) return;
    const confirmed = window.confirm(`Hapus semua ${notifications.length} pesan? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;
    setDeletingAll(true);
    try {
      await notificationsApi.deleteAll();
      setNotifications([]);
      setUnreadCount(0);
      setExpandedId(null);
      toast.success("Semua pesan berhasil dihapus.");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingAll(false);
    }
  };

  const getAlertIcon = (type?: string | null) => {
    if (type === "price_below") return <TrendingDown size={14} style={{ color: "#f87171" }} />;
    if (type === "price_above") return <TrendingUp size={14} style={{ color: "#4ade80" }} />;
    return <Activity size={14} style={{ color: "var(--cyan-highlight)" }} />;
  };

  const getAlertLabel = (type?: string | null) => {
    if (type === "price_below") return "Price ≤ Target";
    if (type === "price_above") return "Price ≥ Target";
    if (type === "percent_change") return "Percent Change";
    return "Price Alert";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopBar unreadCount={unreadCount} />

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "800px",
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "3.5rem",
              fontWeight: 500,
              textTransform: "uppercase",
              color: "var(--text)",
              letterSpacing: "0.02em",
              textAlign: "center",
            }}
          >
            Mailbox
          </h1>

          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            style={{
              height: "36px",
              padding: "0 14px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              color: "var(--text)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: unreadCount === 0 ? "not-allowed" : "pointer",
              opacity: unreadCount === 0 ? 0.5 : 1,
            }}
          >
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Mark all as read
          </button>
        </div>

        {/* Tabs + Delete All */}
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border)" }}>
          {/* Tab buttons */}
          <div style={{ display: "flex", gap: "24px", flex: 1 }}>
            <button
              onClick={() => setFilterUnread(false)}
              style={{
                padding: "12px 4px",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: !filterUnread ? "var(--text)" : "var(--text-muted)",
                borderBottom: !filterUnread ? "2px solid var(--cyan-highlight)" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              All Messages
            </button>
            <button
              onClick={() => setFilterUnread(true)}
              style={{
                padding: "12px 4px",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: filterUnread ? "var(--text)" : "var(--text-muted)",
                borderBottom: filterUnread ? "2px solid var(--cyan-highlight)" : "2px solid transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Unread Messages
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    backgroundColor: "var(--cyan-highlight)",
                    color: "#000",
                    padding: "1px 6px",
                    borderRadius: "9999px",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Delete All button — far right, aligned with tabs */}
          <button
            onClick={handleDeleteAll}
            disabled={deletingAll || notifications.length === 0}
            title="Hapus semua pesan"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid #ef4444",
              backgroundColor: "transparent",
              color: notifications.length === 0 ? "#6b7280" : "#ef4444",
              borderColor: notifications.length === 0 ? "#374151" : "#ef4444",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: notifications.length === 0 ? "not-allowed" : "pointer",
              opacity: deletingAll ? 0.6 : 1,
              transition: "background-color 0.15s ease, color 0.15s ease",
              marginBottom: "1px", /* optically align with tab bottom border */
            }}
            onMouseEnter={(e) => {
              if (notifications.length > 0) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#ef4444";
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = notifications.length === 0 ? "#6b7280" : "#ef4444";
            }}
          >
            {deletingAll
              ? <Loader2 size={13} className="animate-spin" />
              : <Trash2 size={13} />}
            Delete All
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)" }}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "48px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <MailOpen size={36} style={{ color: "var(--text-subtle)", marginBottom: "12px" }} />
            <p style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--text)", marginBottom: "4px" }}>
              Your Mailbox is empty
            </p>
            <p style={{ fontSize: "0.875rem" }}>Price alerts and site updates will appear here</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notifications.map((notif) => {
              const isExpanded = expandedId === notif.id;
              return (
                <div
                  key={notif.id}
                  style={{
                    backgroundColor: notif.is_read ? "var(--surface)" : "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderLeft: notif.is_read
                      ? "1px solid var(--border)"
                      : "4px solid var(--cyan-highlight)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: isExpanded ? "var(--shadow-lg)" : "var(--shadow-sm)",
                    transition: "box-shadow 0.2s ease",
                  }}
                >
                  {/* Message Row — clickable header */}
                  <div
                    onClick={() => handleToggleExpand(notif)}
                    style={{
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      opacity: notif.is_read ? 0.85 : 1,
                    }}
                  >
                    {/* Left: icon + text */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: "var(--surface-offset)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {getAlertIcon(notif.alert_type)}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>
                            {notif.item_display_name || "System Notification"}
                          </span>
                          {notif.item_rarity && (
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              {notif.item_rarity}
                            </span>
                          )}
                          {!notif.is_read && (
                            <span
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                backgroundColor: "var(--cyan-highlight)",
                                color: "#000",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                textTransform: "uppercase",
                              }}
                            >
                              New
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: "0.8125rem",
                            color: "var(--text-muted)",
                            lineHeight: 1.4,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "420px",
                          }}
                        >
                          {notif.message}
                        </p>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                          <RelativeTime date={notif.created_at} />
                        </span>
                      </div>
                    </div>

                    {/* Right: expand + delete */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <div style={{ color: "var(--text-muted)" }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notif.id);
                        }}
                        style={{ color: "#f87171", cursor: "pointer", padding: "4px" }}
                        title="Delete notification"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Detail Panel */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        padding: "16px 20px",
                        backgroundColor: "var(--surface-offset)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      {/* Alert type badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {getAlertIcon(notif.alert_type)}
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {getAlertLabel(notif.alert_type)}
                        </span>
                      </div>

                      {/* Full message */}
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text)",
                          lineHeight: 1.6,
                          padding: "10px 14px",
                          backgroundColor: "var(--surface)",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {notif.message}
                      </div>

                      {/* Price details grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "8px",
                        }}
                      >
                        {notif.target_value != null && (
                          <div
                            style={{
                              padding: "10px 12px",
                              backgroundColor: "var(--surface)",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                              Alert Target
                            </div>
                            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>
                              {notif.currency === "IDR"
                                ? formatIDR(notif.target_value)
                                : formatUSD(notif.target_value)}
                            </div>
                          </div>
                        )}

                        {notif.triggered_price_usd != null && (
                          <div
                            style={{
                              padding: "10px 12px",
                              backgroundColor: "var(--surface)",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                              Triggered Price (USD)
                            </div>
                            <div
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                color: "var(--cyan-highlight)",
                              }}
                            >
                              {formatUSD(notif.triggered_price_usd)}
                            </div>
                          </div>
                        )}

                        {notif.triggered_price_idr != null && (
                          <div
                            style={{
                              padding: "10px 12px",
                              backgroundColor: "var(--surface)",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                              Triggered Price (IDR)
                            </div>
                            <div
                              style={{
                                fontSize: "0.9rem",
                                fontWeight: 600,
                                color: "var(--cyan-highlight)",
                              }}
                            >
                              {formatIDR(notif.triggered_price_idr)}
                            </div>
                          </div>
                        )}

                        <div
                          style={{
                            padding: "10px 12px",
                            backgroundColor: "var(--surface)",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                            Received
                          </div>
                          <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>
                            <RelativeTime date={notif.created_at} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
