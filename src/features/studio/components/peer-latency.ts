import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { PeerView, RoomState } from "@/features/studio/engine/client/room-store";
import { estimateLatency, type LatencyBreakdown } from "@/features/studio/latency";

/**
 * Interface-to-ears estimate for one remote player, or null until both sides
 * have reported and their audio is actually playing.
 */
export function peerLatency(
  engine: StudioEngine,
  state: RoomState,
  peer: PeerView,
): LatencyBreakdown | null {
  if (!peer.state || !peer.stats?.playing) return null;
  return estimateLatency({
    senderInputMs: peer.state.inputLatencyMs,
    frameMs: peer.state.frameMicros / 1000,
    codec: peer.state.codec,
    senderRttMs: peer.state.rttMs,
    receiverRttMs: state.link.rttMs ?? 0,
    bufferMs: peer.stats.bufferMs,
    outputMs: engine.outputLatencyMs,
  });
}
