import type { Rarity } from "@/types";

// ---------------------------------------------------------------------------
// Currency formatters
// ---------------------------------------------------------------------------

const IDR_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatIDR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return IDR_FORMATTER.format(value);
}

export function formatUSD(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return USD_FORMATTER.format(value);
}

export function formatPrice(
  value: number | null | undefined,
  currency: "IDR" | "USD"
): string {
  return currency === "IDR" ? formatIDR(value) : formatUSD(value);
}

/**
 * Calculates the amount the seller receives on the Steam Community Market
 * from the buyer's price (lowest_price), accounting for Steam fees.
 * 
 * Steam Community Market Fees:
 * - Steam Transaction Fee: 5% (minimum 1 cent / 179 IDR)
 * - Game-Specific Publisher Fee: 10% (minimum 1 cent / 179 IDR)
 * 
 * @param buyerPrice - The price paid by the buyer (lowest_price)
 * @param currency - "IDR" or "USD"
 */
export function calculateSteamReceivePrice(
  buyerPrice: number | null | undefined,
  currency: "IDR" | "USD"
): number | null {
  if (buyerPrice === null || buyerPrice === undefined || buyerPrice <= 0) {
    return null;
  }

  if (currency === "USD") {
    const priceCents = Math.round(buyerPrice * 100);
    const minFee = 1; // 1 cent minimum per fee component
    let low = 0;
    let high = priceCents;
    let bestR = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const steamFee = Math.max(minFee, Math.floor(mid * 0.05));
      const pubFee = Math.max(minFee, Math.floor(mid * 0.10));
      const total = mid + steamFee + pubFee;

      if (total <= priceCents) {
        bestR = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return bestR / 100;
  } else {
    // IDR
    const minFee = 179; // Minimum fee per component in IDR (equivalent to $0.01)
    let low = 0;
    let high = Math.round(buyerPrice);
    let bestR = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const steamFee = Math.max(minFee, Math.floor(mid * 0.05));
      const pubFee = Math.max(minFee, Math.floor(mid * 0.10));
      const total = mid + steamFee + pubFee;

      if (total <= buyerPrice) {
        bestR = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return bestR;
  }
}

// ---------------------------------------------------------------------------
// Number formatters
// ---------------------------------------------------------------------------

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

// ---------------------------------------------------------------------------
// Date / time formatters
// ---------------------------------------------------------------------------

export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return "Never";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)} min ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)} hr ago`;
  return `${Math.floor(diffSecs / 86400)} days ago`;
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export function formatCountdown(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return "soon";
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s`;
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ${diffSecs % 60}s`;
  return `${Math.floor(diffSecs / 3600)}h ${Math.floor((diffSecs % 3600) / 60)}m`;
}

// ---------------------------------------------------------------------------
// Rarity helpers
// ---------------------------------------------------------------------------

export const RARITY_COLORS: Record<string, string> = {
  Common: "#B0B0B0",
  Uncommon: "#4CAF50",
  Rare: "#2196F3",
  Epic: "#9C27B0",
  Legendary: "#FFD700",
  Unique: "#FF6B35",
};

export function getRarityColor(rarity: string | null | undefined): string {
  if (!rarity) return "#B0B0B0";
  return RARITY_COLORS[rarity] ?? "#B0B0B0";
}

// ---------------------------------------------------------------------------
// Avatar initials (fallback when no icon_url)
// ---------------------------------------------------------------------------

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
