"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { itemsApi, inventoryApi, getErrorMessage } from "@/lib/api";
import type { ItemSearchResult } from "@/types";
import { ItemAvatar } from "@/components/ui/ItemAvatar";

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

interface AddItemModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddItemModal({ onClose, onSuccess }: AddItemModalProps) {
  const [step, setStep] = useState<"select" | "details">("select");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await itemsApi.search(query);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [query]);

  const handleSelect = (item: ItemSearchResult) => {
    setSelectedItem(item);
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      await inventoryApi.add({
        master_item_id: selectedItem.id,
        quantity,
        notes: notes || undefined,
      });
      toast.success(`${selectedItem.display_name} added to inventory!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          maxWidth: "420px",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "rgba(0, 0, 0, 0.08)",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--text)" }}>
            {step === "select" ? "Select Item" : "Item Details"}
          </h2>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {step === "select"
              ? "Type to search items..."
              : `Set quantity for ${selectedItem?.display_name}`}
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          {step === "select" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ position: "relative" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type name (e.g. Minor Ruby...)"
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    padding: "10px 14px",
                    fontSize: "0.875rem",
                    backgroundColor: "var(--surface-offset)",
                    color: "var(--text)",
                    outline: "none",
                  }}
                />
                {searching && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "12px",
                      color: "var(--text-muted)",
                    }}
                  />
                )}
              </div>

              {results.length > 0 && (
                <div
                  style={{
                    maxHeight: "200px",
                    overflowY: "auto",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--surface-offset)",
                  }}
                >
                  {results.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        color: "var(--text)",
                        borderBottom: "1px solid var(--border)",
                        display: "block",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <ItemAvatar iconUrl={item.icon_url} displayName={item.display_name} rarity={item.rarity} size={28} />
                          <span style={{ color: getRarityStyles(item.rarity).dotColor, fontWeight: 500 }}>
                            {item.display_name}
                          </span>
                        </div>
                        {item.rarity ? (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              border: "1px solid rgba(223, 200, 138, 0.25)",
                              backgroundColor: "rgba(20, 20, 20, 0.6)",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              color: "#dfc88a",
                              lineHeight: 1,
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "1.5px",
                                backgroundColor: getRarityStyles(item.rarity).dotColor,
                                display: "inline-block",
                                boxShadow: `0 0 4px ${getRarityStyles(item.rarity).dotColor}`,
                              }}
                            />
                            {item.rarity}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>—</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-muted)", padding: "16px 0" }}>
                  No items found.
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {selectedItem && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: "var(--surface-offset)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>
                      {selectedItem.display_name}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {selectedItem.rarity || "Common"}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("select")}
                    style={{ fontSize: "0.75rem", color: "var(--cyan-highlight)" }}
                  >
                    Change
                  </button>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    padding: "10px 14px",
                    fontSize: "0.875rem",
                    backgroundColor: "var(--surface-offset)",
                    color: "var(--text)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Notes (optional)
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
                    padding: "10px 14px",
                    fontSize: "0.875rem",
                    backgroundColor: "var(--surface-offset)",
                    color: "var(--text)",
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px 20px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            gap: "10px",
          }}
        >
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
            }}
          >
            Cancel
          </button>
          {step === "details" && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedItem}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                backgroundColor: "var(--primary)",
                color: "var(--text)",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {submitting ? "Adding..." : "Add to Inventory"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
