import { relayReachProblem } from "@/features/studio/relay-reach";

export interface TransportInputs {
  /** The relay's WebTransport address from the room ticket. */
  relayUrl: string;
  /** The WebSocket fallback address, or null when the studio has none. */
  relayWsUrl: string | null;
  pageHostname: string;
  /** The page's query string. `?transport=websocket` forces the fallback. */
  search: string;
  hasWebTransport: boolean;
}

export type TransportPlan =
  /** `direct` says whether QUIC is worth attempting before any fallback. */
  { ok: true; direct: boolean } | { ok: false; problem: string };

/**
 * Decides how this browser should reach the relay, before anything connects.
 * QUIC is tried when its address can work from here and the browser has
 * WebTransport; the WebSocket fallback covers everything else. With neither,
 * the player is told what has to change rather than left with a timeout.
 */
export function planTransport(inputs: TransportInputs): TransportPlan {
  const forced = new URLSearchParams(inputs.search).get("transport") === "websocket";
  const unreachable = relayReachProblem(inputs.relayUrl, inputs.pageHostname);
  const direct = !forced && !unreachable && inputs.hasWebTransport;
  if (direct || inputs.relayWsUrl) return { ok: true, direct };
  if (unreachable) return { ok: false, problem: unreachable };
  if (forced) {
    return { ok: false, problem: "This studio has no WebSocket fallback configured." };
  }
  return {
    ok: false,
    problem: "This browser lacks WebTransport and the studio has no fallback. Use Chrome or Edge.",
  };
}
