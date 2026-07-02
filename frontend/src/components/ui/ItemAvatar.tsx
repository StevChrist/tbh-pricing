"use client";

import { getInitials, getRarityColor } from "@/lib/currency";
import type { Rarity } from "@/types";

interface ItemAvatarProps {
  iconUrl: string | null | undefined;
  displayName: string;
  rarity: Rarity | string | null | undefined;
  size?: number;
}

export function ItemAvatar({
  iconUrl,
  displayName,
  rarity,
  size = 36,
}: ItemAvatarProps) {
  const color = getRarityColor(rarity);
  const initials = getInitials(displayName);

  if (iconUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt={displayName}
        width={size}
        height={size}
        className="rounded-md object-cover [image-rendering:pixelated] [image-rendering:crisp-edges]"
        style={{ width: size, height: size }}
        onError={(e) => {
          // Fall back to initials avatar on image load error
          (e.target as HTMLImageElement).style.display = "none";
          const parent = (e.target as HTMLImageElement).parentElement;
          if (parent) parent.setAttribute("data-fallback", "true");
        }}
      />
    );
  }

  return (
    <div
      className="rounded-md flex items-center justify-center font-bold text-white text-xs select-none shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}30`,
        border: `1px solid ${color}50`,
        color,
        fontSize: size < 32 ? 10 : 12,
      }}
    >
      {initials}
    </div>
  );
}
