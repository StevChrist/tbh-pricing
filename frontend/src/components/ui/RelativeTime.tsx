"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/currency";

interface RelativeTimeProps {
  date: string | null | undefined;
  intervalMs?: number;
}

/**
 * RelativeTime Component
 * Automatically updates its relative time text (e.g., "just now" -> "1 min ago")
 * at the specified interval (default: 10s) without requiring a full page refresh.
 */
export function RelativeTime({ date, intervalMs = 10_000 }: RelativeTimeProps) {
  const [text, setText] = useState(() => formatRelativeTime(date));

  useEffect(() => {
    // Reset immediately when date prop changes
    setText(formatRelativeTime(date));

    const id = setInterval(() => {
      setText(formatRelativeTime(date));
    }, intervalMs);

    return () => clearInterval(id);
  }, [date, intervalMs]);

  return <>{text}</>;
}
