"use client";

import { useState, useEffect, useCallback } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { InventoryTable } from "@/components/dashboard/InventoryTable";
import { AnalyticsSection } from "@/components/dashboard/AnalyticsSection";
import { inventoryApi, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import type { InventoryItem } from "@/types";

export default function DashboardPage() {
  const [unreadCount, setUnreadCount] = useState(0);
  void setUnreadCount; // unreadCount updated by GlobalProviders' carousel

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await inventoryApi.list();
      setItems(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

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
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "36px",
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
            Dashboard
          </h1>
        </div>

        {/* Summary Metrics Cards */}
        <section>
          <SummaryCards />
        </section>

        {/* My Inventory Section */}
        <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.75rem",
                fontWeight: 500,
                color: "var(--text)",
                letterSpacing: "0.01em",
                textAlign: "center",
              }}
            >
              My Inventory
            </h2>
          </div>

          <InventoryTable readOnly items={items} loading={loading} />
        </section>

        {/* Analytics Section */}
        <section>
          <AnalyticsSection items={items} loading={loading} />
        </section>
      </main>
    </div>
  );
}