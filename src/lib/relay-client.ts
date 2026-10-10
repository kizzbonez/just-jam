import "server-only";
import { env } from "@/lib/env";

const TIMEOUT_MS = 1500;

export interface RelayCert {
  /** Base64 SHA-256 of the relay certificate. Empty when it is CA-issued. */
  hash: string;
  notAfter: string;
  /** True when browsers must pin the hash instead of validating a CA chain. */
  pinned: boolean;
}

async function call<T>(path: string, method: "GET" | "POST" = "GET"): Promise<T> {
  const response = await fetch(new URL(path, env().RELAY_ADMIN_URL), {
    method,
    headers: { authorization: `Bearer ${env().RELAY_SHARED_SECRET}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`relay admin ${path} -> ${response.status}`);
  return (await response.json()) as T;
}

export function relayCert(): Promise<RelayCert> {
  return call<RelayCert>("/internal/cert");
}

/** Peers per live room id. Returns null when the relay cannot be reached. */
export async function relayCounts(): Promise<Record<string, number> | null> {
  try {
    return (await call<{ rooms: Record<string, number> }>("/internal/rooms")).rooms;
  } catch {
    return null;
  }
}

/** Disconnects everyone in a room. Best effort: a closed room issues no new tickets. */
export async function relayCloseRoom(roomId: string): Promise<void> {
  await call(`/internal/rooms/${encodeURIComponent(roomId)}/close`, "POST").catch(() => undefined);
}
