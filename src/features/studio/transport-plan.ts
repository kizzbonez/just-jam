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
  /** Whether the browser has WebRTC, which links between players need. */
  hasPeerConnection: boolean;
}

export type TransportPlan =
  /**
   * `direct` says whether QUIC to the relay is worth attempting before any
   * fallback. `p2p` says whether to link to the other players' browsers;
   * `?p2p=off` keeps all audio on the relay.
   */
  { ok: true; direct: boolean; p2p: boolean } | { ok: false; problem: string };

/**
 * Decides how this browser should reach the relay, before anything connects.
 * QUIC is tried when its address can work from here and the browser has
 * WebTransport; the WebSocket fallback covers everything else. With neither,
 * the player is told what has to change rather than left with a timeout.
 */
export function planTransport(inputs: TransportInputs): TransportPlan {
  const params = new URLSearchParams(inputs.search);
  const forced = params.get("transport") === "websocket";
  const p2p = inputs.hasPeerConnection && params.get("p2p") !== "off";
  const unreachable = relayReachProblem(inputs.relayUrl, inputs.pageHostname);
  const direct = !forced && !unreachable && inputs.hasWebTransport;
  if (direct || inputs.relayWsUrl) return { ok: true, direct, p2p };
  if (unreachable) return { ok: false, problem: unreachable };
  if (forced) {
    return { ok: false, problem: "This studio has no WebSocket fallback configured." };
  }
  return {
    ok: false,
    problem: "This browser lacks WebTransport and the studio has no fallback. Use Chrome or Edge.",
  };
}
