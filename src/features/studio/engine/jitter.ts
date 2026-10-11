/**
 * Measures how unevenly packets arrive. Each packet carries the sender's
 * sample clock, so `arrival - timestamp` is the transit time plus an unknown
 * constant. Subtracting the recent minimum leaves how late each packet was
 * compared with the fastest ones, which is exactly what a jitter buffer has
 * to absorb.
 */
import { SAMPLE_RATE } from "@/features/studio/audio-profile";

const WINDOW = 1024;
const BASELINE_MS = 5000;
const SAMPLES_PER_MS = SAMPLE_RATE / 1000;

export class JitterEstimator {
  private readonly lateness = new Float32Array(WINDOW);
  private readonly scratch = new Float32Array(WINDOW);
  private count = 0;
  private cursor = 0;
  private baseline = Infinity;
  private baselineAt = 0;
  private nextBaseline = Infinity;
  private lastTransit: number | null = null;
  private firstTimestamp: number | null = null;
  /** RFC 3550 interarrival jitter, in milliseconds. */
  jitterMs = 0;

  reset(): void {
    this.count = 0;
    this.cursor = 0;
    this.baseline = Infinity;
    this.nextBaseline = Infinity;
    this.lastTransit = null;
    this.firstTimestamp = null;
    this.jitterMs = 0;
  }

  /** Records one packet. Returns how late it was, in milliseconds. */
  update(timestamp: number, arrivalMs: number): number {
    this.firstTimestamp ??= timestamp;
    // Wrap-safe elapsed samples since the first packet of this stream.
    const elapsed = (timestamp - this.firstTimestamp) | 0;
    const transit = arrivalMs - elapsed / SAMPLES_PER_MS;
    if (this.lastTransit !== null) {
      this.jitterMs += (Math.abs(transit - this.lastTransit) - this.jitterMs) / 16;
    }
    this.lastTransit = transit;
    this.rollBaseline(transit, arrivalMs);
    const late = Math.max(0, transit - this.baseline);
    this.lateness[this.cursor] = late;
    this.cursor = (this.cursor + 1) % WINDOW;
    if (this.count < WINDOW) this.count++;
    return late;
  }

  /**
   * Tracks the minimum transit over two overlapping windows, so the baseline
   * follows slow clock drift between the two machines without ever jumping.
   */
  private rollBaseline(transit: number, nowMs: number): void {
    if (transit < this.baseline) this.baseline = transit;
    if (transit < this.nextBaseline) this.nextBaseline = transit;
    if (nowMs - this.baselineAt < BASELINE_MS) return;
    this.baseline = this.nextBaseline;
    this.nextBaseline = Infinity;
    this.baselineAt = nowMs;
  }

  /** The lateness that `quantile` of recent packets stayed under, in ms. */
  latenessQuantile(quantile: number): number {
    if (this.count === 0) return 0;
    const sorted = this.scratch.subarray(0, this.count);
    sorted.set(this.lateness.subarray(0, this.count));
    sorted.sort();
    return sorted[Math.min(this.count - 1, Math.floor(quantile * this.count))];
  }
}
