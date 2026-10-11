/**
 * Peak-meter behaviour, separate from drawing so it can be tested: fast
 * attack, steady release, a held peak marker and a latched clip lamp.
 */

export const FLOOR_DB = -60;
const RELEASE_DB_PER_SECOND = 26;
const HOLD_SECONDS = 1.4;
const CLIP_SECONDS = 2;
const CLIP_LEVEL = 0.985;

export interface MeterChannel {
  /** Displayed level in dBFS. */
  level: number;
  /** Held peak in dBFS. */
  hold: number;
  holdAge: number;
  /** Seconds left on the clip lamp. */
  clip: number;
}

export const idleChannel = (): MeterChannel => ({
  level: FLOOR_DB,
  hold: FLOOR_DB,
  holdAge: 0,
  clip: 0,
});

export const toDb = (linear: number) => (linear <= 0.001 ? FLOOR_DB : 20 * Math.log10(linear));

/** Advances one channel by `dt` seconds given the latest linear peak. */
export function stepMeter(channel: MeterChannel, peak: number, dt: number): void {
  const input = Math.max(FLOOR_DB, Math.min(0, toDb(peak)));
  channel.level = Math.max(input, channel.level - RELEASE_DB_PER_SECOND * dt);
  channel.holdAge += dt;
  if (input >= channel.hold || channel.holdAge > HOLD_SECONDS) {
    channel.hold = Math.max(input, channel.level);
    channel.holdAge = 0;
  }
  channel.clip = peak >= CLIP_LEVEL ? CLIP_SECONDS : Math.max(0, channel.clip - dt);
}

/** How many of `segments` are lit for a level in dBFS. */
export function litSegments(db: number, segments: number): number {
  const fraction = (db - FLOOR_DB) / -FLOOR_DB;
  return Math.max(0, Math.min(segments, Math.round(fraction * segments)));
}
