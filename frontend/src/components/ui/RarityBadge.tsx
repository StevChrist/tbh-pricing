"use client";

import { cn } from "@/lib/utils";
import { getRarityColor } from "@/lib/currency";
import type { Rarity } from "@/types";

interface RarityBadgeProps {
  rarity: Rarity | string | null | undefined;
  size?: "sm" | "md";
}

export function RarityBadge({ rarity, size = "sm" }: RarityBadgeProps) {
  if (!rarity) return null;
  const color = getRarityColor(rarity);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      )}
      style={{
        color,
        borderColor: `${color}40`,
        backgroundColor: `${color}15`,
      }}
    >
      {rarity}
    </span>
  );
}
