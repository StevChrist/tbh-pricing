"use client";

import { useState } from "react";
import { NotifPopupCarousel } from "@/components/notifications/NotifPopupCarousel";

/**
 * GlobalProviders — mounted once in the root layout (server component).
 * Hosts the NotifPopupCarousel so it persists across all page navigations
 * without remounting, keeping the shownRef state intact.
 */
export function GlobalProviders({ children }: { children: React.ReactNode }) {
  const [, setUnreadCount] = useState(0);

  return (
    <>
      {children}
      <NotifPopupCarousel onUnreadChange={setUnreadCount} />
    </>
  );
}
