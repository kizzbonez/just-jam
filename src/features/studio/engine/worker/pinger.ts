import { decodePong, encodePing } from "@/features/studio/engine/wire";

const INTERVAL_MS = 500;
const SMOOTHING = 0.2;

/** Measures the round trip to the relay with small datagrams, twice a second. */
export class Pinger {
  private timer: ReturnType<typeof setInterval> | null = null;
  /** Smoothed round trip in ms, or null before the first reply. */
  rttMs: number | null = null;

  start(send: (datagram: Uint8Array) => void): void {
    this.stop();
    const ping = () => send(encodePing(performance.now()));
    ping();
    this.timer = setInterval(ping, INTERVAL_MS);
  }

  /** Returns true when the datagram was a pong and has been consumed. */
  accept(data: Uint8Array, arrivalMs: number): boolean {
    const sentAt = decodePong(data);
    if (sentAt === null) return false;
    const sample = Math.max(0, arrivalMs - sentAt);
    this.rttMs = this.rttMs === null ? sample : this.rttMs + (sample - this.rttMs) * SMOOTHING;
    return true;
  }

  stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
