import { hardNavigate } from "@/lib/hard-navigate";

const FALLBACK = "/lobby";

/**
 * Reads the `next` query parameter and returns it only when it is a local
 * path. Anything that could leave this origin falls back to the lobby.
 */
export function safeNextPath(search: string, fallback = FALLBACK): string {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}

/** Full navigation, so every server component re-renders with the new session. */
export function enterStudio(path?: string): void {
  hardNavigate(path ?? safeNextPath(window.location.search));
}
