"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Pencil, Trash2, RefreshCw, Bell, X, ChevronUp, ChevronDown, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR, formatUSD, formatRelativeTime, calculateSteamReceivePrice } from "@/lib/currency";
import { inventoryApi, pricesApi, alertsApi, getErrorMessage } from "@/lib/api";
import type { InventoryItem } from "@/types";
import { ItemAvatar } from "@/components/ui/ItemAvatar";
import { RelativeTime } from "@/components/ui/RelativeTime";

const getRarityStyles = (rarity: string | null | undefined) => {
  const r = rarity?.toUpperCase() || "COMMON";
  let dotColor = "#e4e4e4";
  switch (r) {
    case "COMMON":
      dotColor = "#e4e4e4";
      break;
    case "UNCOMMON":
      dotColor = "#54fc0c";
      break;
    case "RARE":
      dotColor = "#2f8bfc";
      break;
    case "LEGENDARY":
      dotColor = "#fc9c0c";
      break;
    case "IMMORTAL":
      dotColor = "#fc2424";
      break;
    case "ARCANA":
      dotColor = "#b40cfc";
      break;
    case "BEYOND":
      dotColor = "#fc246c";
      break;
    case "CELESTIAL":
      dotColor = "#6ccce4";
      break;
    case "DIVINE":
      dotColor = "#fce454";
      break;
    case "COSMIC":
      dotColor = "#fcfcfc";
      break;
  }
  return { dotColor };
};

interface InventoryTableProps {
  onRefresh?: () => void;
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
  filterRarity?: string;
  showBulkSelect?: boolean;
  readOnly?: boolean;
}

interface EditModalProps {
  item: InventoryItem;
  onClose: () => void;
  onSave: (id: number, quantity: number, notes: string) => Promise<void>;
}

function EditModal({ item, onClose, onSave }: EditModalProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.id, quantity, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--text)" }}>
            Edit Item Qty / Notes
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none" }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>
          {item.master_item.display_name}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Quantity
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{
                width: "100%",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                padding: "8px 12px",
                fontSize: "0.875rem",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes..."
              style={{
                width: "100%",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                padding: "8px 12px",
                fontSize: "0.875rem",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                outline: "none",
                resize: "none",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              cursor: "pointer",
              backgroundColor: "transparent",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "var(--primary)",
              color: "var(--text)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface SetAlertModalProps {
  item: InventoryItem;
  onClose: () => void;
}

function SetAlertModal({ item, onClose }: SetAlertModalProps) {
  const [alertType, setAlertType] = useState<"price_below" | "price_above">("price_below");
  const [currency, setCurrency] = useState<"USD" | "IDR">("USD");
  const [targetValue, setTargetValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetValue || isNaN(Number(targetValue)) || Number(targetValue) <= 0) {
      toast.error("Please enter a valid price threshold.");
      return;
    }
    setSaving(true);
    try {
      await alertsApi.create({
        master_item_id: item.master_item.id,
        alert_type: alertType,
        currency: currency,
        target_value: Number(targetValue),
      });
      toast.success("Price alert set successfully.");
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />
      <form
        onSubmit={handleSave}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--text)" }}>
            Set Price Alert
          </h2>
          <button type="button" onClick={onClose} style={{ color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none" }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text)" }}>
          {item.master_item.display_name}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Condition
            </label>
            <select
              value={alertType}
              onChange={(e) => setAlertType(e.target.value as any)}
              style={{
                width: "100%",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                padding: "8px",
                fontSize: "0.875rem",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                outline: "none",
              }}
            >
              <option value="price_below">Price goes below</option>
              <option value="price_above">Price goes above</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              style={{
                width: "100%",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                padding: "8px",
                fontSize: "0.875rem",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                outline: "none",
              }}
            >
              <option value="USD">USD ($)</option>
              <option value="IDR">IDR (Rp)</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px" }}>
            Threshold Value
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "0.875rem",
                color: "var(--text-muted)",
              }}
            >
              {currency === "USD" ? "$" : "Rp"}
            </span>
            <input
              type="number"
              step="any"
              required
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="0.00"
              style={{
                width: "100%",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                padding: "8px 12px 8px 36px",
                fontSize: "0.875rem",
                backgroundColor: "var(--surface-offset)",
                color: "var(--text)",
                outline: "none",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              cursor: "pointer",
              backgroundColor: "transparent",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "var(--primary)",
              color: "var(--text)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
            }}
          >
            {saving ? "Setting..." : "Set Alert"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

interface DeleteConfirmationModalProps {
  itemName: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteConfirmationModal({ itemName, onClose, onConfirm, isDeleting }: DeleteConfirmationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--text)" }}>
            Remove Item
          </h2>
          <button
            onClick={onClose}
            style={{
              color: "var(--text-muted)",
              cursor: "pointer",
              background: "none",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Are you sure you want to remove <strong style={{ color: "var(--text)" }}>{itemName}</strong> from your inventory? This action cannot be undone.
        </p>

        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              fontSize: "0.875rem",
              cursor: "pointer",
              backgroundColor: "transparent",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
            }}
          >
            {isDeleting ? "Removing..." : "Yes, Remove"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function InventoryTable({
  onRefresh,
  selectedIds,
  onSelectionChange,
  filterRarity,
  showBulkSelect = false,
  readOnly = false,
}: InventoryTableProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [alertItem, setAlertItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

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

  // Auto-refresh: re-fetch when backend reports new price sync
  useAutoRefresh(fetchInventory);

  const filteredItems = useMemo(() => {
    return filterRarity
      ? items.filter(
          (i) =>
            i.master_item.rarity?.toUpperCase() === filterRarity.toUpperCase()
        )
      : items;
  }, [items, filterRarity]);

  const handleDelete = useCallback((id: number, name: string) => {
    setDeleteItem({ id, name });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await inventoryApi.delete(deleteItem.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
      toast.success(`${deleteItem.name} removed from inventory.`);
      setDeleteItem(null);
      onRefresh?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }, [deleteItem, onRefresh]);

  const handleRefreshOne = useCallback(async (masterItemId: number, id: number) => {
    setRefreshing(id);
    try {
      await pricesApi.refreshOne(masterItemId);
      await fetchInventory();
      toast.success("Price updated.");
      onRefresh?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRefreshing(null);
    }
  }, [fetchInventory, onRefresh]);

  const handleSaveEdit = useCallback(async (id: number, quantity: number, notes: string) => {
    try {
      const { data } = await inventoryApi.update(id, { quantity, notes });
      setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
      toast.success("Item updated.");
      onRefresh?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
      throw err;
    }
  }, [onRefresh]);

  const toggleSelect = useCallback((id: number) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  }, [onSelectionChange, selectedIds]);

  const toggleSelectAll = useCallback(() => {
    if (!onSelectionChange || !selectedIds) return;
    if (selectedIds.size === filteredItems.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(filteredItems.map((i) => i.id)));
    }
  }, [onSelectionChange, selectedIds, filteredItems]);

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => [
    ...(showBulkSelect
      ? [{
          id: "select",
          header: () => (
            <input
              type="checkbox"
              checked={selectedIds?.size === filteredItems.length && filteredItems.length > 0}
              onChange={toggleSelectAll}
              style={{
                cursor: "pointer",
                accentColor: "var(--cyan-highlight)",
              }}
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              checked={selectedIds?.has(row.original.id) ?? false}
              onChange={() => toggleSelect(row.original.id)}
              style={{
                cursor: "pointer",
                accentColor: "var(--cyan-highlight)",
              }}
            />
          ),
          size: 40,
        } as ColumnDef<InventoryItem>]
      : []),
    {
      id: "item",
      header: "ITEM",
      accessorFn: (r) => r.master_item.display_name,
      cell: ({ row }) => {
        const item = row.original.master_item;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "32px", height: "32px", flexShrink: 0 }}>
              <ItemAvatar iconUrl={item.icon_url} displayName={item.display_name} rarity={item.rarity} size={32} />
            </div>
            <span style={{ fontWeight: 500, color: getRarityStyles(item.rarity).dotColor, fontSize: "0.875rem" }}>
              {item.display_name}
            </span>
          </div>
        );
      },
    },
    {
      id: "rarity",
      header: "RARITY",
      accessorFn: (r) => r.master_item.rarity,
      cell: ({ row }) => {
        const rarity = row.original.master_item.rarity;
        if (!rarity) return <span>—</span>;
        const styles = getRarityStyles(rarity);
        return (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 12px",
              borderRadius: "9999px",
              border: "1px solid rgba(223, 200, 138, 0.25)",
              backgroundColor: "rgba(20, 20, 20, 0.6)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              color: "#dfc88a",
              lineHeight: 1,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                backgroundColor: styles.dotColor,
                display: "inline-block",
                boxShadow: `0 0 6px ${styles.dotColor}`,
              }}
            />
            {rarity}
          </div>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: "QTY",
      cell: ({ getValue }) => (
        <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          {getValue() as number}
        </span>
      ),
    },
    {
      id: "price_idr",
      header: "PRICE (IDR)",
      accessorFn: (r) => r.latest_price?.lowest_price_idr,
      cell: ({ row }) => {
        const p = row.original.latest_price;
        if (!p || p.fetch_status === "unavailable")
          return <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>Unavailable</span>;
        if (p.fetch_status === "error")
          return <span style={{ fontSize: "0.75rem", color: "red" }}>Error</span>;
        return (
          <span style={{ fontSize: "0.875rem", color: "var(--text)" }}>
            {formatIDR(p.lowest_price_idr)}
          </span>
        );
      },
    },
    {
      id: "receive_idr",
      header: "RECEIVE (IDR)",
      accessorFn: (r) => {
        const p = r.latest_price?.lowest_price_idr;
        return p != null ? calculateSteamReceivePrice(p, "IDR") : null;
      },
      cell: ({ row }) => {
        const p = row.original.latest_price;
        if (!p || p.fetch_status !== "ok")
          return <span style={{ fontSize: "0.875rem", color: "var(--text-subtle)" }}>—</span>;
        const receiveVal = calculateSteamReceivePrice(p.lowest_price_idr, "IDR");
        return (
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {formatIDR(receiveVal)}
          </span>
        );
      },
    },
    {
      id: "price_usd",
      header: "PRICE (USD)",
      accessorFn: (r) => r.latest_price?.lowest_price_usd,
      cell: ({ row }) => {
        const p = row.original.latest_price;
        if (!p || p.fetch_status !== "ok")
          return <span style={{ fontSize: "0.875rem", color: "var(--text-subtle)" }}>—</span>;
        return (
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {formatUSD(p.lowest_price_usd)}
          </span>
        );
      },
    },
    {
      id: "total_idr",
      header: "TOTAL (IDR)",
      accessorFn: (r) =>
        r.latest_price?.lowest_price_idr != null
          ? r.latest_price.lowest_price_idr * r.quantity
          : null,
      cell: ({ row }) => {
        const p = row.original.latest_price;
        if (!p?.lowest_price_idr)
          return <span style={{ fontSize: "0.875rem", color: "var(--text-subtle)" }}>—</span>;
        return (
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cyan-highlight)" }}>
            {formatIDR(p.lowest_price_idr * row.original.quantity)}
          </span>
        );
      },
    },
    {
      id: "updated",
      header: "PRICE UPDATED",
      accessorFn: (r) => r.latest_price?.fetched_at,
      cell: ({ row }) => (
        <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          <RelativeTime date={row.original.latest_price?.fetched_at} />
        </span>
      ),
    },
    ...(!readOnly
      ? [{
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => handleRefreshOne(row.original.master_item_id, row.original.id)}
                disabled={refreshing === row.original.id}
                title="Refresh price"
                style={{ color: "var(--accent-blue)" }}
              >
                <RefreshCw size={14} className={refreshing === row.original.id ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => setAlertItem(row.original)}
                title="Set Price Alert"
                style={{ color: "var(--accent-orange)" }}
              >
                <Bell size={14} />
              </button>
              <button
                onClick={() => setEditItem(row.original)}
                title="Edit"
                style={{ color: "var(--text-muted)" }}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(row.original.id, row.original.master_item.display_name)}
                title="Delete"
                style={{ color: "#f87171" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ),
        } as ColumnDef<InventoryItem>]
      : []),
  ], [
    showBulkSelect,
    selectedIds,
    filteredItems,
    toggleSelectAll,
    toggleSelect,
    readOnly,
    refreshing,
    handleRefreshOne,
    handleDelete,
  ]);

  const tableItems = useMemo(() => {
    return readOnly ? filteredItems.slice(0, 10) : filteredItems;
  }, [readOnly, filteredItems]);

  const table = useReactTable({
    data: tableItems,
    columns: columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!loading && filteredItems.length === 0) {
    return (
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
        <p style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--text)", marginBottom: "4px" }}>
          Inventory Empty
        </p>
        <p style={{ fontSize: "0.875rem" }}>
          Add items from the Browse page
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ minWidth: "800px" }}>
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        padding: "12px 16px",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        letterSpacing: "0.05em",
                        backgroundColor: "rgba(0, 0, 0, 0.15)",
                        cursor: header.column.getCanSort() ? "pointer" : "default",
                        userSelect: "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          header.column.getIsSorted() === "asc" ? (
                            <ChevronUp size={12} />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ChevronDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                          )
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={columns.length} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                    Loading inventory...
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="animate-row-fade"
                    style={{
                      borderBottom: "1px solid var(--border)",
                      transition: "background-color var(--transition)",
                      animationDelay: `${index * 25}ms`,
                      opacity: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} style={{ padding: "14px 16px" }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {readOnly && filteredItems.length > 10 && (
          <div
            style={{
              textAlign: "center",
              padding: "14px 0",
              borderTop: "1px solid var(--border)",
              backgroundColor: "rgba(0, 0, 0, 0.08)",
            }}
          >
            <Link
              href="/inventory"
              prefetch={false}
              style={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "var(--text-muted)",
                textDecoration: "none",
              }}
            >
              See More ...
            </Link>
          </div>
        )}
      </div>

      {editItem && (
        <EditModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={handleSaveEdit}
        />
      )}

      {alertItem && (
        <SetAlertModal
          item={alertItem}
          onClose={() => setAlertItem(null)}
        />
      )}

      {deleteItem && (
        <DeleteConfirmationModal
          itemName={deleteItem.name}
          isDeleting={isDeleting}
          onClose={() => setDeleteItem(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
