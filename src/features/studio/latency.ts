import type { CodecValue } from "@/features/studio/audio-profile";

export interface LatencyParts {
  /** Capture delay the sender's browser reports for its interface. */
  senderInputMs: number;
  frameMs: number;
  codec: CodecValue;
  /** Round trip from the sender to the relay. */
  senderRttMs: number;
  /** Round trip from this browser to the relay. */
  receiverRttMs: number;
  /** Audio waiting in this player's jitter buffer. */
  bufferMs: number;
  /** Output delay this browser reports for the playback device. */
  outputMs: number;
}

export interface LatencyBreakdown {
  captureMs: number;
  framingMs: number;
  networkMs: number;
  bufferMs: number;
  outputMs: number;
  totalMs: number;
}

/** Opus in low-delay (CELT) mode looks 2.5 ms ahead. PCM has no lookahead. */
const OPUS_LOOKAHEAD_MS = 2.5;

/**
 * Estimated time from the other player's interface to this player's ears.
 * It is an estimate: capture and output delays are what each browser reports,
 * which on some systems understates the driver's own buffering.
 */
export function estimateLatency(parts: LatencyParts): LatencyBreakdown {
  // A sample waits between zero and one frame for its frame to fill.
  const framingMs = parts.frameMs / 2 + (parts.codec === "OPUS" ? OPUS_LOOKAHEAD_MS : 0);
  const networkMs = parts.senderRttMs / 2 + parts.receiverRttMs / 2;
  const totalMs =
    parts.senderInputMs + framingMs + networkMs + parts.bufferMs + parts.outputMs;
  return {
    captureMs: parts.senderInputMs,
    framingMs,
    networkMs,
    bufferMs: parts.bufferMs,
    outputMs: parts.outputMs,
    totalMs,
  };
}

/** One decimal below 100, whole numbers above, and a dash when unknown. */
export function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "--";
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}
