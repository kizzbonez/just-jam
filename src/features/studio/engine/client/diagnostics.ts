import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { SignalTap } from "@/features/studio/engine/client/signal-tap";

function measure(tap: SignalTap | null) {
  if (!tap) return { peaks: [0, 0], toneHz: [0, 0] };
  const peaks = new Float32Array(2);
  tap.readPeaks(peaks);
  return { peaks: [peaks[0], peaks[1]], toneHz: tap.readTone() };
}

/**
 * A read-only snapshot of a live session: the same numbers the console shows,
 * plus measured levels and dominant frequency per channel. Exposed as
 * `window.__tonelink.diagnostics()` for support and for the end-to-end tests.
 */
export function collectDiagnostics(engine: StudioEngine) {
  const state = engine.store.getState();
  return {
    phase: state.phase,
    closeReason: state.closeReason,
    selfSlot: state.selfSlot,
    maxDatagram: state.maxDatagram,
    link: state.link,
    profile: state.profile,
    outputLatencyMs: engine.outputLatencyMs,
    input: { ...state.input, ...measure(engine.inputTap) },
    peers: state.peers.map((peer) => ({
      slot: peer.slot,
      name: peer.name,
      host: peer.host,
      state: peer.state ?? null,
      mix: peer.mix,
      stats: peer.stats,
      ...measure(engine.peerTap(peer.slot)),
    })),
  };
}

export type Diagnostics = ReturnType<typeof collectDiagnostics>;
