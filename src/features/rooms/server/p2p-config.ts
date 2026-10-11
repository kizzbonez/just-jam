import "server-only";
import { env } from "@/lib/env";

export interface P2pConfig {
  /** STUN servers each browser asks for its public address. May be empty. */
  iceServers: { urls: string[] }[];
}

/** Reads a comma separated list, keeping only STUN addresses. `none` gives an empty list. */
export function parseStunUrls(value: string): string[] {
  return value
    .split(",")
    .map((url) => url.trim())
    .filter((url) => /^stuns?:[^\s]+$/.test(url));
}

/**
 * What browsers need in order to link to each other, or null when the studio
 * keeps all audio on the relay.
 */
export function p2pConfig(): P2pConfig | null {
  const { P2P_MODE, P2P_STUN_URLS } = env();
  if (P2P_MODE === "off") return null;
  const urls = parseStunUrls(P2P_STUN_URLS);
  return { iceServers: urls.length > 0 ? [{ urls }] : [] };
}
