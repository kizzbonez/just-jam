"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-reads the lobby on an interval while the tab is visible, for live counts. */
export function LobbyRefresh({ everyMs = 8000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [router, everyMs]);
  return null;
}
