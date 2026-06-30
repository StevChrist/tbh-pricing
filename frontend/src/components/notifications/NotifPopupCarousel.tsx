"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Bell, ChevronLeft, ChevronRight, ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { notificationsApi } from "@/lib/api";
import { formatIDR, formatUSD, formatRelativeTime } from "@/lib/currency";
import type { Notification } from "@/types";

const DISMISS_AFTER_MS = 15_000;
const POLL_INTERVAL_MS = 5_000;

interface NotifPopupCarouselProps {
  onUnreadChange?: (count: number) => void;
}

export function NotifPopupCarousel({ onUnreadChange }: NotifPopupCarouselProps) {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DISMISS_AFTER_MS / 1000);
  const shownRef = useRef<Set<number>>(new Set());

  const fetchUnread = useCallback(async () => {
    if (pathname === "/login" || pathname === "/register") return;
    try {
      const { data } = await notificationsApi.unread();
      
      // 1. Filter for critical admin alerts (type === "alert")
      const newAlerts = data.notifications.filter(
        (n) => n.notification_type === "alert" && !shownRef.current.has(n.id)
      );
      if (newAlerts.length > 0) {
        setCriticalAlerts((prev) => [...prev, ...newAlerts]);
        newAlerts.forEach((n) => shownRef.current.add(n.id));
      }
      
      // 2. Filter for toast notifications (price alerts or type === "notification")
      const newToasts = data.notifications.filter(
        (n) =>
          (n.notification_type === "notification" || n.alert_id != null) &&
          !shownRef.current.has(n.id)
      );
      if (newToasts.length > 0) {
        setNotifications(newToasts);
        setCurrentIndex(0);
        setVisible(true);
        setTimeLeft(DISMISS_AFTER_MS / 1000);
        newToasts.forEach((n) => shownRef.current.add(n.id));
      }

      onUnreadChange?.(data.unread_count);
    } catch {
      // non-critical
    }
  }, [onUnreadChange, pathname]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  // Auto-dismiss countdown
  useEffect(() => {
    if (!visible) return;
    if (timeLeft <= 0) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, timeLeft]);

  const dismiss = () => setVisible(false);

  const markCurrentRead = async () => {
    const notif = notifications[currentIndex];
    if (!notif) return;
    try {
      await notificationsApi.markRead(notif.id);
    } catch {}
  };

  const handlePrev = () => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : notifications.length - 1));
    setTimeLeft(DISMISS_AFTER_MS / 1000);
  };

  const handleNext = () => {
    setCurrentIndex((i) => (i < notifications.length - 1 ? i + 1 : 0));
    setTimeLeft(DISMISS_AFTER_MS / 1000);
  };

  const handleAcknowledgeAlert = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setCriticalAlerts((prev) => prev.filter((a) => a.id !== id));
      // Re-fetch count
      const { data } = await notificationsApi.unread();
      onUnreadChange?.(data.unread_count);
    } catch {}
  };

  const notif = notifications[currentIndex];
  const alertTypeLabel =
    notif?.alert_type === "price_below"
      ? "Price ≤ Target"
      : notif?.alert_type === "price_above"
      ? "Price ≥ Target"
      : notif?.alert_type === "percent_change"
      ? "Price Change"
      : "Alert";

  return (
    <>
      {/* 1. Critical Admin Alert Modal (Portal) */}
      {criticalAlerts.length > 0 &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 99999,
            }}
          >
            <div
              className="animate-modal-pop"
              style={{
                backgroundColor: "var(--surface)",
                border: "1.5px solid var(--cyan-highlight)",
                borderRadius: "14px",
                width: "min(420px, 90vw)",
                padding: "26px",
                boxShadow: "0 0 25px rgba(0, 240, 255, 0.25), var(--shadow-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
                fontFamily: "var(--font-body)",
                textAlign: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ padding: "10px", borderRadius: "50%", backgroundColor: "rgba(0,240,255,0.08)", color: "var(--cyan-highlight)" }}>
                  <ShieldAlert size={32} />
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--text)", margin: "4px 0 0 0" }}>
                  Important System Alert
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  From: Site Administrator
                </span>
              </div>

              <div
                style={{
                  fontSize: "0.875rem",
                  color: "var(--text)",
                  lineHeight: 1.5,
                  padding: "14px 16px",
                  backgroundColor: "var(--surface-offset)",
                  borderRadius: "8px",
                  textAlign: "left",
                  whiteSpace: "pre-wrap",
                }}
              >
                {criticalAlerts[0].message}
              </div>

              <button
                onClick={() => handleAcknowledgeAlert(criticalAlerts[0].id)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "var(--cyan-highlight)",
                  color: "#000",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Acknowledge & Close
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* 2. Standard Toast Notification Carousel */}
      {visible && notifications.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "32px",
            left: "50vw",
            transform: "translateX(-50%)",
            width: "min(420px, calc(100vw - 32px))",
            zIndex: 9999,
            fontFamily: "var(--font-body)",
            willChange: "transform",
          }}
        >
          <div
            style={{
              borderRadius: "12px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--surface)",
              boxShadow: "0 0 25px var(--glow-color), var(--shadow-lg)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom: "1px solid var(--border)",
                backgroundColor: "rgba(0, 0, 0, 0.15)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Bell size={14} style={{ color: "var(--cyan-highlight)" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--cyan-highlight)" }}>
                  {notif.alert_id != null ? "Price Alert Triggered" : "System Notification"}
                </span>
                {notifications.length > 1 && (
                  <span style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginLeft: "4px" }}>
                    {currentIndex + 1}/{notifications.length}
                  </span>
                )}
              </div>
              <button
                onClick={dismiss}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.6875rem",
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span>{timeLeft}s</span>
                <X size={14} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
                  {notif.item_display_name || "Admin Update"}
                </p>
                {notif.alert_id != null && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    {alertTypeLabel}
                  </p>
                )}
              </div>

              <div
                style={{
                  borderRadius: "8px",
                  padding: "10px 12px",
                  backgroundColor: "var(--surface-offset)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  fontSize: "0.75rem",
                }}
              >
                {notif.alert_id != null ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Target:</span>
                      <span style={{ fontWeight: 500, color: "var(--text)" }}>
                        {notif.currency === "IDR"
                          ? formatIDR(notif.target_value || 0)
                          : formatUSD(notif.target_value || 0)}
                      </span>
                    </div>
                    {notif.triggered_price_idr != null && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Price IDR:</span>
                        <span style={{ fontWeight: 600, color: "var(--cyan-highlight)" }}>
                          {formatIDR(notif.triggered_price_idr)}
                        </span>
                      </div>
                    )}
                    {notif.triggered_price_usd != null && (
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-muted)" }}>Price USD:</span>
                        <span style={{ fontWeight: 600, color: "var(--cyan-highlight)" }}>
                          {formatUSD(notif.triggered_price_usd)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: "var(--text)", lineHeight: 1.4, fontSize: "0.8rem" }}>
                    {notif.message}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: notif.alert_id != null ? "none" : "1px solid var(--border)", paddingTop: notif.alert_id != null ? 0 : "4px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Time:</span>
                  <span style={{ color: "var(--text-muted)" }}>{formatRelativeTime(notif.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 16px",
                borderTop: "1px solid var(--border)",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              }}
            >
              {notifications.length > 1 ? (
                <button onClick={handlePrev} style={{ cursor: "pointer", color: "var(--text-muted)", background: "none", border: "none" }}>
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <div />
              )}

              <Link
                href="/mailbox"
                onClick={() => {
                  markCurrentRead();
                  dismiss();
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--cyan-highlight)",
                  textDecoration: "none",
                  padding: "6px 0",
                }}
              >
                <ExternalLink size={12} />
                View Mailbox
              </Link>

              {notifications.length > 1 ? (
                <button onClick={handleNext} style={{ cursor: "pointer", color: "var(--text-muted)", background: "none", border: "none" }}>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <div />
              )}
            </div>

            {/* Timer Bar */}
            <div
              style={{
                height: "2px",
                backgroundColor: "var(--cyan-highlight)",
                width: `${(timeLeft / (DISMISS_AFTER_MS / 1000)) * 100}%`,
                transition: "width 1s linear",
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
