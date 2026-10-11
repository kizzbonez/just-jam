import type { PeerStats } from "@/features/studio/engine/messages";

/** One minute at four samples a second. */
export const HISTORY_POINTS = 240;
export const HISTORY_STEP_SECONDS = 0.25;

export interface HistoryView {
  /** Oldest first. */
  bufferMs: number[];
  targetMs: number[];
  latenessMs: number[];
  /** True where at least one underrun happened in that step. */
  underrun: boolean[];
}

interface Ring {
  buffer: Float32Array;
  target: Float32Array;
  lateness: Float32Array;
  underrun: Uint8Array;
  head: number;
  length: number;
  lastUnderruns: number;
}

const newRing = (): Ring => ({
  buffer: new Float32Array(HISTORY_POINTS),
  target: new Float32Array(HISTORY_POINTS),
  lateness: new Float32Array(HISTORY_POINTS),
  underrun: new Uint8Array(HISTORY_POINTS),
  head: 0,
  length: 0,
  lastUnderruns: 0,
});

/**
 * Rolling buffer telemetry per player, for the trace scope. Kept outside the
 * store so a minute of history is not copied on every update.
 */
export class TelemetryHistory {
  private readonly rings = new Map<number, Ring>();

  push(stats: PeerStats[]): void {
    for (const item of stats) {
      const ring = this.rings.get(item.slot) ?? newRing();
      this.rings.set(item.slot, ring);
      ring.buffer[ring.head] = item.bufferMs;
      ring.target[ring.head] = item.targetMs;
      ring.lateness[ring.head] = item.latenessMs;
      ring.underrun[ring.head] = item.underruns > ring.lastUnderruns ? 1 : 0;
      ring.lastUnderruns = item.underruns;
      ring.head = (ring.head + 1) % HISTORY_POINTS;
      ring.length = Math.min(HISTORY_POINTS, ring.length + 1);
    }
  }

  drop(slot: number): void {
    this.rings.delete(slot);
  }

  view(slot: number): HistoryView {
    const ring = this.rings.get(slot);
    const view: HistoryView = { bufferMs: [], targetMs: [], latenessMs: [], underrun: [] };
    if (!ring) return view;
    const start = (ring.head - ring.length + HISTORY_POINTS) % HISTORY_POINTS;
    for (let i = 0; i < ring.length; i++) {
      const index = (start + i) % HISTORY_POINTS;
      view.bufferMs.push(ring.buffer[index]);
      view.targetMs.push(ring.target[index]);
      view.latenessMs.push(ring.lateness[index]);
      view.underrun.push(ring.underrun[index] === 1);
    }
    return view;
  }
}
