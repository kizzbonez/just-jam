/**
 * Reverb and echo on your own input. They are applied before the audio is
 * sent, so everyone in the room hears them, and they run beside the untouched
 * signal, so they add nothing to its latency.
 */
export const REVERB_SIZES = ["ROOM", "HALL", "CATHEDRAL"] as const;
export type ReverbSize = (typeof REVERB_SIZES)[number];

export const REVERB_LABELS: Record<ReverbSize, string> = {
  ROOM: "Room",
  HALL: "Hall",
  CATHEDRAL: "Cathedral",
};

/** Seconds for each room's tail to fall by 60 dB. */
export const REVERB_SECONDS: Record<ReverbSize, number> = { ROOM: 0.7, HALL: 1.8, CATHEDRAL: 3.6 };

export const ECHO_MS = { min: 60, max: 800, step: 10 } as const;
/** Above this an echo would never die away. */
export const MAX_ECHO_REPEATS = 0.85;

export interface FxSettings {
  /** Reverb level, 0 to 1. Zero switches it off. */
  reverb: number;
  reverbSize: ReverbSize;
  /** Echo level, 0 to 1. Zero switches it off. */
  echo: number;
  /** Time between echoes, in ms. */
  echoMs: number;
  /** How much of each echo feeds the next one, 0 to MAX_ECHO_REPEATS. */
  echoRepeats: number;
  /** Monitor plays only the effects, for use beside an interface's direct monitoring. */
  monitorWetOnly: boolean;
}

export const DEFAULT_FX: FxSettings = {
  reverb: 0,
  reverbSize: "HALL",
  echo: 0,
  echoMs: 320,
  echoRepeats: 0.35,
  monitorWetOnly: false,
};

/** Keeps a number inside a range, or takes the fallback when it is not a number at all. */
const within = (min: number, max: number) => (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const level = within(0, 1);
const echoTime = within(ECHO_MS.min, ECHO_MS.max);
const repeats = within(0, MAX_ECHO_REPEATS);

/** Makes valid settings out of anything, for values read back from storage. */
export function coerceFx(value: unknown): FxSettings {
  const raw = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    reverb: level(raw.reverb, DEFAULT_FX.reverb),
    reverbSize: REVERB_SIZES.find((size) => size === raw.reverbSize) ?? DEFAULT_FX.reverbSize,
    echo: level(raw.echo, DEFAULT_FX.echo),
    echoMs: Math.round(echoTime(raw.echoMs, DEFAULT_FX.echoMs)),
    echoRepeats: repeats(raw.echoRepeats, DEFAULT_FX.echoRepeats),
    monitorWetOnly: raw.monitorWetOnly === true,
  };
}

/** Silence before the tail starts, as sound takes a moment to reach the first wall. */
const PRE_DELAY_SECONDS = 0.008;

/**
 * One channel of a synthetic room: noise that dies away evenly, 60 dB down
 * after `seconds`, and duller towards the end, as the air in a real room makes
 * it. `random` returns values from 0 up to 1. A separate stream of them for
 * each channel is what gives the tail its width.
 */
export function reverbTail(seconds: number, sampleRate: number, random: () => number): Float32Array {
  const start = Math.floor(PRE_DELAY_SECONDS * sampleRate);
  const tail = new Float32Array(start + Math.ceil(seconds * sampleRate));
  let smooth = 0;
  for (let i = start; i < tail.length; i++) {
    const progress = (i - start) / (seconds * sampleRate);
    // A one-pole low-pass that closes as the tail goes on.
    smooth += (random() * 2 - 1 - smooth) * (0.9 - 0.65 * progress);
    tail[i] = smooth * 10 ** (-3 * progress);
  }
  return tail;
}
