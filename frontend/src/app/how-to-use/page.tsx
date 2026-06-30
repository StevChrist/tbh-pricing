"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Package, Clock, Bell, Inbox, FileSpreadsheet, KeyRound } from "lucide-react";

export default function HowToUsePage() {
  const [unreadCount, setUnreadCount] = useState(0);

  const steps = [
    {
      icon: <Package size={18} style={{ color: "var(--cyan-highlight)" }} />,
      title: "1. Manage Your Inventory",
      desc: "Go to the 'Browse Items' page to see all items in the Task Bar Hero collection. Search, filter by gear type or rarity, and click '+' to add them to your inventory, or use checkboxes to bulk-add items.",
    },
    {
      icon: <Clock size={18} style={{ color: "var(--text-muted)" }} />,
      title: "2. Automatic 30-Minute Price Syncs",
      desc: "All tracked prices are automatically fetched from the Steam Market in both USD and IDR. The system also runs background seed jobs to keep metadata up to date.",
    },
    {
      icon: <Bell size={18} style={{ color: "var(--accent-orange)" }} />,
      title: "3. Set Custom Price Alerts",
      desc: "Click the bell icon on any item row in your Inventory or Browse Items view. Set condition thresholds (e.g. price drops below $12.50 or Rp 200,000) and get notified.",
    },
    {
      icon: <Inbox size={18} style={{ color: "var(--primary-hover)" }} />,
      title: "4. Unified Mailbox & Settings",
      desc: "Check the 'Mailbox' page for unified notification feeds. Go to Profile Settings in the top-right corner to manage credentials or export your portfolio details as a CSV sheet.",
    },
  ];

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
        className="animate-container-slide"
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "700px",
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Page Title */}
        <div style={{ display: "flex", justifyContent: "center" }}>
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
            How To Use
          </h1>
        </div>

        {/* Steps Stack */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {steps.map((step, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                gap: "16px",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h3
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--text)",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    lineHeight: "1.5",
                  }}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
