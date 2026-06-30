"use client";

import { useState, useCallback } from "react";
import { Download, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { InventoryTable } from "@/components/dashboard/InventoryTable";
import { AddItemModal } from "@/components/inventory/AddItemModal";
import { inventoryApi, pricesApi, exportApi, getErrorMessage } from "@/lib/api";
import { RefreshCw } from "lucide-react";

const RARITY_OPTIONS = ["All", "Common", "Uncommon", "Rare", "Legendary", "Immortal", "Arcana", "Beyond", "Celestial", "Divine", "Cosmic"];

export default function InventoryPage() {
  const [filterRarity, setFilterRarity] = useState<string | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger((t) => t + 1);
    setSelectedIds(new Set());
  }, []);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} items from inventory?`)) return;
    setDeletingBulk(true);
    try {
      const { data } = await inventoryApi.bulkDelete({ ids: Array.from(selectedIds) });
      toast.success(`${data.deleted} items deleted.`);
      triggerRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportApi.csv();
      toast.success("CSV downloaded successfully.");
    } catch {
      toast.error("Failed to export CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const { data } = await pricesApi.refreshAll();
      toast.success(data.message || "Price sync complete.");
      triggerRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSyncingAll(false);
    }
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
        {/* Header Block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
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
            Manage Inventory
          </h1>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              style={{
                height: "38px",
                padding: "0 16px",
                borderRadius: "8px",
                border: "1px solid var(--cyan-highlight)",
                backgroundColor: "transparent",
                color: "var(--cyan-highlight)",
                fontSize: "0.875rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: syncingAll ? "not-allowed" : "pointer",
                opacity: syncingAll ? 0.6 : 1,
              }}
            >
              <RefreshCw size={16} className={syncingAll ? "animate-spin" : ""} />
              Sync Prices
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                height: "38px",
                padding: "0 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--surface)",
                color: "var(--text)",
                fontSize: "0.875rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                height: "38px",
                padding: "0 16px",
                borderRadius: "8px",
                backgroundColor: "var(--primary)",
                color: "var(--text)",
                fontSize: "0.875rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>
        </div>

        {/* Rarity filter tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {RARITY_OPTIONS.map((r) => {
            const isActive = (r === "All" && !filterRarity) || r === filterRarity;
            return (
              <button
                key={r}
                onClick={() => setFilterRarity(r === "All" ? undefined : r)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  backgroundColor: isActive ? "var(--primary)" : "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  cursor: "pointer",
                  transition: "background-color var(--transition)",
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 16px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#f87171" }}>
              {selectedIds.size} items selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={deletingBulk}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                backgroundColor: "#ef4444",
                color: "var(--text)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {deletingBulk ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                marginLeft: "auto",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              Clear Selection
            </button>
          </div>
        )}

        {/* Table View */}
        <section>
          <InventoryTable
            key={refreshTrigger}
            onRefresh={triggerRefresh}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            filterRarity={filterRarity}
            showBulkSelect
          />
        </section>
      </main>

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onSuccess={triggerRefresh}
        />
      )}
    </div>
  );
}
