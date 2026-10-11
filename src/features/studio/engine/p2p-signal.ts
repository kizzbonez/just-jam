/**
 * Negotiation messages two players exchange, through the relay, to set up a
 * link between their browsers. They come from another player's browser, so
 * each one is checked before it reaches WebRTC.
 */
import type { P2pSignal } from "@/features/studio/engine/messages";

const MAX_SDP_CHARS = 5000;
const MAX_CANDIDATE_CHARS = 400;
/** Most candidates one message may carry. The sender batches to this size. */
export const MAX_CANDIDATES = 8;

function isCandidate(value: unknown): value is RTCIceCandidateInit {
  if (typeof value !== "object" || value === null) return false;
  const { candidate } = value as { candidate?: unknown };
  return typeof candidate === "string" && candidate.length <= MAX_CANDIDATE_CHARS;
}

/** Keeps only the fields WebRTC reads, with the types it expects. */
function pickCandidate(value: RTCIceCandidateInit): RTCIceCandidateInit {
  const picked: RTCIceCandidateInit = {
    candidate: value.candidate,
    sdpMid: typeof value.sdpMid === "string" ? value.sdpMid : null,
    sdpMLineIndex: typeof value.sdpMLineIndex === "number" ? value.sdpMLineIndex : null,
  };
  if (typeof value.usernameFragment === "string") picked.usernameFragment = value.usernameFragment;
  return picked;
}

function parseCandidates(list: unknown): P2pSignal | null {
  if (!Array.isArray(list) || list.length > MAX_CANDIDATES) return null;
  return list.every(isCandidate) ? { k: "ice", list: list.map(pickCandidate) } : null;
}

/** Returns the message when it is well formed, and null for anything else. */
export function parseSignal(value: unknown): P2pSignal | null {
  if (typeof value !== "object" || value === null) return null;
  const { k, sdp, list } = value as Record<string, unknown>;
  if (k === "ice") return parseCandidates(list);
  if (k !== "offer" && k !== "answer") return null;
  return typeof sdp === "string" && sdp.length <= MAX_SDP_CHARS ? { k, sdp } : null;
}
