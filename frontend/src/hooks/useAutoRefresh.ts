"use client";

import { useEffect, useRef, useCallback } from "react";
import { inventoryApi } from "@/lib/api";

/**
 * useAutoRefresh — polls the backend summary endpoint every `intervalMs` ms.
 * When the server's `last_refreshed_at` changes (price sync ran),
 * it calls `onRefresh()` to trigger a re-fetch in the parent component.
 *
 * This avoids blindly re-fetching heavy data every N seconds;
 * instead we only poll a lightweight summary call, and only re-fetch
 * full data when prices actually changed.
 *
 * @param onRefresh   Callback to invoke when new price data is detected
 * @param intervalMs  How often to poll (default: 60s)
 * @param enabled     Set false to pause polling (e.g. when page is hidden)
 */
export function useAutoRefresh(
  onRefresh: () => void,
  intervalMs = 60_000,
  enabled = true
) {
  const lastSeenRef = useRef<string | null>(null);
  const onRefreshRef = useRef(onRefresh);
  // Keep ref up-to-date without re-subscribing the interval
  onRefreshRef.current = onRefresh;

  const checkForUpdates = useCallback(async () => {
    try {
      const { data } = await inventoryApi.summary();
      const newTs = data.last_refreshed_at ?? null;
      if (lastSeenRef.current !== null && newTs !== lastSeenRef.current) {
        // Price data changed → notify caller
        onRefreshRef.current();
      }
      lastSeenRef.current = newTs;
    } catch {
      // Silently ignore network errors during background polling
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Run immediately to initialise lastSeenRef
    checkForUpdates();

    const id = setInterval(checkForUpdates, intervalMs);
    return () => clearInterval(id);
  }, [checkForUpdates, intervalMs, enabled]);
}
