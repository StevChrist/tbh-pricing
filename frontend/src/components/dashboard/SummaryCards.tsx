"use client";

import { useEffect, useState } from "react";
import { Package, DollarSign, TrendingUp, Clock } from "lucide-react";
import { formatIDR, formatUSD, formatRelativeTime } from "@/lib/currency";
import { inventoryApi } from "@/lib/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { RelativeTime } from "@/components/ui/RelativeTime";
import type { InventorySummary } from "@/types";

interface SummaryCardsProps {
  refreshTrigger?: number;
}

export function SummaryCards({ refreshTrigger }: SummaryCardsProps) {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoTick, setAutoTick] = useState(0);

  // Detect backend price syncs and re-fetch summary automatically
  useAutoRefresh(() => setAutoTick((t) => t + 1));

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await inventoryApi.summary();
        setSummary(data);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [refreshTrigger, autoTick]);

  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "20px",
          width: "100%",
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "TOTAL ITEMS",
      value: (
        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.25rem",
              fontWeight: 500,
              color: "var(--text)",
              lineHeight: 1,
            }}
          >
            {summary?.total_unique_items ?? 0}
          </span>
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>unique</span>
        </div>
      ),
      sub: `Total Qty ${summary?.total_quantity ?? 0}`,
      icon: <Package size={18} style={{ color: "var(--cyan-highlight)" }} />,
      iconBg: "rgba(0, 229, 255, 0.08)",
    },
    {
      label: "TOTAL VALUES (IDR)",
      value: (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.25rem",
            fontWeight: 500,
            color: "var(--text)",
            lineHeight: 1,
          }}
        >
          {summary?.total_value_idr != null ? formatIDR(summary.total_value_idr) : "Rp 0"}
        </span>
      ),
      sub: `${summary?.total_value_usd != null ? formatUSD(summary.total_value_usd) : "$0.00"} USD`,
      icon: <DollarSign size={18} style={{ color: "#22c55e" }} />,
      iconBg: "rgba(34, 197, 94, 0.08)",
    },
    {
      label: "HIGHEST VALUE",
      value: (
        <span
          title={summary?.highest_value_item?.display_name ?? "—"}
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.25rem",
            fontWeight: 500,
            color: "var(--text)",
            display: "block",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.1,
          }}
        >
          {summary?.highest_value_item?.display_name ?? "—"}
        </span>
      ),
      sub: summary?.highest_value_item
        ? `${formatIDR(summary.highest_value_item.total_value_idr)}`
        : "No items",
      icon: <TrendingUp size={18} style={{ color: "var(--accent-orange)" }} />,
      iconBg: "rgba(255, 179, 0, 0.08)",
    },
    {
      label: "LAST REFRESH MARKET",
      value: (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "2.25rem",
            fontWeight: 500,
            color: "var(--text)",
            lineHeight: 1,
          }}
        >
          {summary?.last_refreshed_at ? <RelativeTime date={summary.last_refreshed_at} /> : "No Sync Yet"}
        </span>
      ),
      sub: "Auto syncs every 30m",
      icon: <Clock size={18} style={{ color: "var(--text-muted)" }} />,
      iconBg: "rgba(255, 255, 255, 0.05)",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "20px",
        width: "100%",
      }}
    >
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "140px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Label + Icon */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              {card.label}
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: card.iconBg,
              }}
            >
              {card.icon}
            </div>
          </div>

          {/* Value + Sub */}
          <div style={{ marginTop: "12px" }}>
            <div>{card.value}</div>
            <div
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                marginTop: "6px",
              }}
            >
              {card.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}