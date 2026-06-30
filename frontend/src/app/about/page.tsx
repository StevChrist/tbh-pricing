"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Package, Award, Heart } from "lucide-react";

export default function AboutPage() {
  const [unreadCount, setUnreadCount] = useState(0);

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
          maxWidth: "700px",
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "28px",
        }}
      >
        {/* Page Title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
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
            About
          </h1>
          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <div
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                backgroundColor: "var(--primary)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: "0.8125rem",
                fontWeight: 600,
                letterSpacing: "0.02em",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              v1.1.0 (Current)
            </div>
          </div>
        </div>

        {/* Info Card */}
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
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: "1.6" }}>
            <p>
              Task Bar Hero (TBH) has a rich economy of in-game items, weapons, armor, accessories, and crafting materials traded on the Steam Community Market. Because pricing fluctuates dynamically, players need a central, automated dashboard to monitor their portfolio valuations in IDR and USD.
            </p>
            <p>
              TBH Price Tracker is built to track prices in real-time, compute cumulative quantity values, and trigger custom alerts. The platform seeds pricing metadata in the background and runs regular 30-minute updates so you never miss a market shift.
            </p>
          </div>
        </div>

        {/* Game Details Card */}
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
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#dfc88a",
              margin: 0,
            }}
          >
            About the game
          </h2>

          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: "1.6", margin: 0 }}>
            TBH: Task Bar Hero is developed by Nugem Studio and Tesseract Studio and published by Nugem Studio. It released free-to-play on Steam on May 27, 2026. It is a tiny idle ARPG that runs in your Windows taskbar.
          </p>

          <div style={{ display: "flex", flexDirection: "column", borderRadius: "8px", border: "1px solid var(--border)", overflow: "hidden" }}>
            {[
              { label: "Name", value: "TBH: Task Bar Hero", highlight: true },
              { label: "Developer", value: "Nugem Studio, Tesseract Studio" },
              { label: "Publisher", value: "Nugem Studio" },
              { label: "Release", value: "2026-05-27" },
              { label: "Platforms", value: "Windows 10/11 (64-bit)" },
              { label: "Price", value: "Free to Play" },
              { label: "Steam App ID", value: "3678970" },
            ].map((row, idx) => (
              <div
                key={row.label}
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  padding: "12px 16px",
                  fontSize: "0.875rem",
                  borderBottom: idx === 6 ? "none" : "1px solid var(--border)",
                  backgroundColor: idx % 2 === 0 ? "rgba(255, 255, 255, 0.01)" : "transparent",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>{row.label}</span>
                <span style={{ color: row.highlight ? "#dfc88a" : "var(--text)", fontWeight: row.highlight ? 600 : 400 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <a
            href="https://store.steampowered.com/app/3678970/TBH_Task_Bar_Hero/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "rgba(223, 200, 138, 0.08)",
              border: "1px solid rgba(223, 200, 138, 0.2)",
              color: "#dfc88a",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all var(--transition)",
              alignSelf: "flex-start",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(223, 200, 138, 0.15)";
              e.currentTarget.style.borderColor = "rgba(223, 200, 138, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(223, 200, 138, 0.08)";
              e.currentTarget.style.borderColor = "rgba(223, 200, 138, 0.2)";
            }}
          >
            <span>View on Steam Store</span>
          </a>
        </div>

        {/* Disclaimer Card */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.01)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "18px 24px",
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
            lineHeight: "1.5",
            textAlign: "center",
            fontStyle: "italic",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          This site is unofficial and is not affiliated with, sponsored by, or endorsed by Nugem Studio, Tesseract Studio, or any other party. It serves solely as a tool to assist users or players of the game TBH.
        </div>
      </main>
    </div>
  );
}
