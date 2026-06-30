"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/TopBar";
import { itemsApi, getErrorMessage } from "@/lib/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { formatUSD } from "@/lib/currency";
import { ItemAvatar } from "@/components/ui/ItemAvatar";
import type { MasterItem } from "@/types";

const RARITY_OPTIONS = ["All", "Common", "Uncommon", "Rare", "Legendary", "Immortal", "Arcana", "Beyond", "Celestial", "Divine", "Cosmic"];
const GEAR_TYPE_OPTIONS = ["All", "Amulet", "Armor", "Axe", "Bolt", "Boots", "Bow", "Bracer", "Crossbow", "Earing", "Gloves", "Hatchet", "Helmet", "Orb", "Ring", "Scepter", "Shield", "Staff", "Sword", "Tome", "Wand"];
const CLASS_OPTIONS = ["All", "Knight", "Ranger", "Sorcerer", "Priest", "Hunter", "Slayer"];
const TYPE_OPTIONS = ["All Type", "Gear", "Material", "Stagebox"];

interface BrowseItem extends MasterItem {
  lowest_price_usd?: number | null;
  median_price_usd?: number | null;
}

export default function ItemsPage() {
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterRarity, setFilterRarity] = useState<string>("All");
  const [filterGearType, setFilterGearType] = useState<string>("All");
  const [filterClass, setFilterClass] = useState<string>("All");
  const [filterItemType, setFilterItemType] = useState<string>("All Type");
  const [filterLevel, setFilterLevel] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("rarity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [unreadCount, setUnreadCount] = useState(0);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchItems = useCallback(async (q?: string, rarity?: string, gearType?: string, classType?: string, itemType?: string, level?: string, sortByVal = "rarity", sortOrderVal: "asc" | "desc" = "asc", p = 1) => {
    setLoading(true);
    try {
      const { data } = await itemsApi.browseList({
        page: p,
        limit: 20,
        search: q || undefined,
        rarity: rarity === "All" ? undefined : rarity,
        gear_type: gearType === "All" ? undefined : gearType,
        class_type: classType === "All" ? undefined : classType,
        item_type: (itemType === "All" || itemType === "All Type") ? undefined : itemType,
        level: level ? parseInt(level, 10) : undefined,
        sort_by: sortByVal,
        sort_order: sortOrderVal,
      });
      setItems(data.items);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(query, filterRarity, filterGearType, filterClass, filterItemType, filterLevel, sortBy, sortOrder, page);
  }, [page, filterRarity, filterGearType, filterClass, filterItemType, filterLevel, sortBy, sortOrder, fetchItems]);

  // Auto-refresh: re-fetch current page when backend syncs new prices
  useAutoRefresh(() => {
    fetchItems(query, filterRarity, filterGearType, filterClass, filterItemType, filterLevel, sortBy, sortOrder, page);
  });

  useEffect(() => {
    setPage(1);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchItems(query, filterRarity, filterGearType, filterClass, filterItemType, filterLevel, sortBy, sortOrder, 1);
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [query, filterRarity, filterGearType, filterClass, filterItemType, filterLevel, sortBy, sortOrder, fetchItems]);

  const handleClearFilters = () => {
    setQuery("");
    setFilterRarity("All");
    setFilterGearType("All");
    setFilterClass("All");
    setFilterItemType("All Type");
    setFilterLevel("");
    setSortBy("rarity");
    setSortOrder("asc");
    setPage(1);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, page - 2);
      let endPage = Math.min(totalPages, page + 2);
      if (page <= 3) {
        startPage = 1;
        endPage = maxButtons;
      } else if (page >= totalPages - 2) {
        startPage = totalPages - maxButtons + 1;
        endPage = totalPages;
      }
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

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

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const renderSortHeader = (label: string, field: string, align: "left" | "center" | "right" = "left") => {
    const isSorted = sortBy === field;
    return (
      <th
        onClick={() => handleSort(field)}
        style={{
          padding: "12px 16px",
          textAlign: align,
          fontSize: "0.75rem",
          fontWeight: 600,
          color: isSorted ? "var(--text)" : "var(--text-muted)",
          cursor: "pointer",
          userSelect: "none",
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text)";
        }}
        onMouseLeave={(e) => {
          if (!isSorted) {
            e.currentTarget.style.color = "var(--text-muted)";
          }
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start", width: "100%" }}>
          <span>{label}</span>
          <span style={{ fontSize: "0.7rem", opacity: isSorted ? 1 : 0.4 }}>
            {isSorted ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--background)", color: "var(--text)" }}>
      <TopBar unreadCount={unreadCount} />

      <main
        style={{
          maxWidth: "1400px",
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
            Browse Items
          </h1>
        </div>

        {/* Horizontal Filters Bar */}
        <div
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "3.2fr 1fr 1fr 1fr 1fr 0.8fr 90px",
            gap: "12px",
            alignItems: "end",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Search Input */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Search
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search item names ..."
                style={{
                  width: "100%",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "0 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Type Dropdown */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Type
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={filterItemType}
                onChange={(e) => setFilterItemType(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "0 28px 0 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                  appearance: "none",
                }}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: "10px", top: "11px", color: "var(--text-muted)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Rarity Dropdown */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Rarity
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "0 28px 0 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: filterRarity === "All" ? "var(--text)" : getRarityStyles(filterRarity).dotColor,
                  fontWeight: filterRarity === "All" ? 400 : 600,
                  outline: "none",
                  appearance: "none",
                }}
              >
                {RARITY_OPTIONS.map((opt) => (
                  <option
                    key={opt}
                    value={opt}
                    style={{
                      color: opt === "All" ? "var(--text)" : getRarityStyles(opt).dotColor,
                      backgroundColor: "var(--surface)",
                    }}
                  >
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: "10px", top: "11px", color: filterRarity === "All" ? "var(--text-muted)" : getRarityStyles(filterRarity).dotColor, pointerEvents: "none" }} />
            </div>
          </div>

          {/* Gear Dropdown */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Gear
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={filterGearType}
                onChange={(e) => setFilterGearType(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "0 28px 0 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                  appearance: "none",
                }}
              >
                {GEAR_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: "10px", top: "11px", color: "var(--text-muted)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Class Dropdown */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              Class
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "0 28px 0 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                  appearance: "none",
                }}
              >
                {CLASS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: "10px", top: "11px", color: "var(--text-muted)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* Level (LV) Input */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px" }}>
              LV
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                min={1}
                max={100}
                value={filterLevel}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || (parseInt(val, 10) >= 1 && parseInt(val, 10) <= 100)) {
                    setFilterLevel(val);
                  }
                }}
                placeholder="All"
                style={{
                  width: "100%",
                  height: "36px",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  padding: "0 12px",
                  fontSize: "0.875rem",
                  backgroundColor: "var(--surface-offset)",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Clear Button */}
          <button
            onClick={handleClearFilters}
            style={{
              width: "100%",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "transparent",
              border: "1px solid var(--primary)",
              color: "var(--primary)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all var(--transition)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--primary)";
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.boxShadow = "0 0 10px var(--glow-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--primary)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            Clear
          </button>
        </div>

        {/* Table View */}
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
            <table style={{ minWidth: "100%", width: "100%" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(0, 0, 0, 0.15)" }}>
                  {renderSortHeader("ITEM", "name", "left")}
                  {renderSortHeader("RARITY", "rarity", "left")}
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>TYPE</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>CLASS</th>
                  {renderSortHeader("LV", "level", "center")}
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)" }}>STATS</th>
                  {renderSortHeader("PRICE (USD)", "price", "right")}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                        Loading items...
                      </div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                      No items found.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        animation: `slideInUp 0.3s ease-out ${index * 30}ms both`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Item Column */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ width: "40px", height: "40px", flexShrink: 0 }}>
                            <ItemAvatar iconUrl={item.icon_url} displayName={item.display_name} rarity={item.rarity} size={40} />
                          </div>
                          <span style={{ fontWeight: 500, color: getRarityStyles(item.rarity).dotColor, fontSize: "0.875rem", wordBreak: "break-word" }}>
                            {item.display_name}
                          </span>
                        </div>
                      </td>

                      {/* Rarity Column */}
                      <td style={{ padding: "14px 16px" }}>
                        {item.rarity ? (
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
                                backgroundColor: getRarityStyles(item.rarity).dotColor,
                                display: "inline-block",
                                boxShadow: `0 0 6px ${getRarityStyles(item.rarity).dotColor}`,
                              }}
                            />
                            {item.rarity}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Type Column */}
                      <td style={{ padding: "14px 16px", color: "var(--text)", fontSize: "0.875rem" }}>
                        {item.gear_type || "—"}
                      </td>

                      {/* Class Column */}
                      <td style={{ padding: "14px 16px", color: "var(--text)", fontSize: "0.875rem" }}>
                        {item.class_type || "—"}
                      </td>

                      {/* Level Column */}
                      <td style={{ padding: "14px 16px", textAlign: "center", color: "var(--text)", fontSize: "0.875rem" }}>
                        {item.level ? item.level : "—"}
                      </td>

                      {/* Stats Column */}
                      <td style={{ padding: "14px 16px", color: "var(--text-muted)", fontSize: "0.875rem", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.stats || "—"}
                      </td>

                      {/* Price Column */}
                      <td style={{ padding: "14px 16px", textAlign: "right", color: "var(--highlight-price)", fontWeight: 600, fontSize: "0.875rem" }}>
                        {item.lowest_price_usd ? formatUSD(item.lowest_price_usd) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "12px", alignItems: "center" }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: page === 1 ? "var(--text-subtle)" : "var(--text)",
                cursor: page === 1 ? "default" : "pointer",
                fontSize: "0.875rem",
                transition: "all var(--transition)",
              }}
              onMouseEnter={(e) => {
                if (page > 1) {
                  e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface)";
              }}
            >
              ‹
            </button>

            {getPageNumbers().map((pNum) => {
              return (
                <button
                  key={pNum}
                  onClick={() => setPage(pNum)}
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: page === pNum ? "var(--primary)" : "var(--surface)",
                    border: "1px solid var(--border)",
                    color: page === pNum ? "var(--text)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: page === pNum ? 600 : 400,
                    transition: "all var(--transition)",
                  }}
                  onMouseEnter={(e) => {
                    if (page !== pNum) {
                      e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (page !== pNum) {
                      e.currentTarget.style.backgroundColor = "var(--surface)";
                    }
                  }}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: page === totalPages ? "var(--text-subtle)" : "var(--text)",
                cursor: page === totalPages ? "default" : "pointer",
                fontSize: "0.875rem",
                transition: "all var(--transition)",
              }}
              onMouseEnter={(e) => {
                if (page < totalPages) {
                  e.currentTarget.style.backgroundColor = "var(--surface-hover)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--surface)";
              }}
            >
              ›
            </button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
