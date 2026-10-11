import { describe, expect, it } from "vitest";
import {
  coerceFx,
  DEFAULT_FX,
  MAX_ECHO_REPEATS,
  REVERB_SECONDS,
  reverbTail,
} from "@/features/studio/engine/fx";

/** A small repeatable generator, so the tail is the same on every run. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const rms = (samples: Float32Array) =>
  Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);

describe("coerceFx", () => {
  it("starts with both effects off", () => {
    expect(coerceFx(null)).toEqual(DEFAULT_FX);
    expect(DEFAULT_FX.reverb).toBe(0);
    expect(DEFAULT_FX.echo).toBe(0);
  });

  it("keeps valid settings as they are", () => {
    const settings = {
      reverb: 0.4,
      reverbSize: "CATHEDRAL",
      echo: 0.25,
      echoMs: 450,
      echoRepeats: 0.5,
      monitorWetOnly: true,
    };
    expect(coerceFx(settings)).toEqual(settings);
  });

  it("pulls out-of-range values back into range", () => {
    const fixed = coerceFx({ reverb: 7, echo: -1, echoMs: 5000, echoRepeats: 2 });
    expect(fixed.reverb).toBe(1);
    expect(fixed.echo).toBe(0);
    expect(fixed.echoMs).toBe(800);
    expect(fixed.echoRepeats).toBe(MAX_ECHO_REPEATS);
  });

  it("falls back to the defaults for anything that is not a setting", () => {
    const fixed = coerceFx({ reverb: "loud", reverbSize: "STADIUM", echoMs: Number.NaN });
    expect(fixed.reverb).toBe(DEFAULT_FX.reverb);
    expect(fixed.reverbSize).toBe(DEFAULT_FX.reverbSize);
    expect(fixed.echoMs).toBe(DEFAULT_FX.echoMs);
    expect(coerceFx("nonsense")).toEqual(DEFAULT_FX);
  });
});

describe("reverbTail", () => {
  const RATE = 48_000;

  it("lasts as long as the room, after a short silence", () => {
    const tail = reverbTail(REVERB_SECONDS.HALL, RATE, seeded(1));
    expect(tail.length / RATE).toBeCloseTo(REVERB_SECONDS.HALL + 0.008, 2);
    expect(tail.subarray(0, 300).every((sample) => sample === 0)).toBe(true);
  });

  it("dies away by about 60 dB", () => {
    const tail = reverbTail(1, RATE, seeded(2));
    const early = rms(tail.subarray(500, 2900));
    const late = rms(tail.subarray(tail.length - 2400));
    expect(20 * Math.log10(late / early)).toBeLessThan(-50);
    expect(Math.max(...tail.map(Math.abs))).toBeLessThanOrEqual(1);
  });

  it("gives each channel its own tail", () => {
    const left = reverbTail(0.7, RATE, seeded(3));
    const right = reverbTail(0.7, RATE, seeded(4));
    expect(left).not.toEqual(right);
  });
});
