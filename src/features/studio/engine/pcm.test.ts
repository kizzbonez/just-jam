import { describe, expect, it } from "vitest";
import { packPcm16, packPcm24, unpackPcm16, unpackPcm24 } from "@/features/studio/engine/pcm";

/** Planar stereo: a ramp on the left, its mirror on the right. */
function ramp(frames: number): Float32Array {
  const planar = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    planar[i] = (i / (frames - 1)) * 2 - 1;
    planar[frames + i] = -planar[i];
  }
  return planar;
}

const maxError = (a: Float32Array, b: Float32Array) =>
  a.reduce((worst, value, index) => Math.max(worst, Math.abs(value - b[index])), 0);

describe("PCM transport", () => {
  it("round-trips 16-bit audio within one quantisation step", () => {
    const input = ramp(240);
    const bytes = packPcm16(input, 240);
    expect(bytes.byteLength).toBe(240 * 4);
    expect(maxError(input, unpackPcm16(bytes))).toBeLessThan(1 / 32_767);
  });

  it("round-trips 24-bit audio within one quantisation step", () => {
    const input = ramp(120);
    const bytes = packPcm24(input, 120);
    expect(bytes.byteLength).toBe(120 * 6);
    expect(maxError(input, unpackPcm24(bytes))).toBeLessThan(1 / 8_388_607);
  });

  it("keeps the channels apart and preserves sign", () => {
    const input = new Float32Array([0.5, -0.25, -0.5, 0.25]);
    const out16 = unpackPcm16(packPcm16(input, 2));
    const out24 = unpackPcm24(packPcm24(input, 2));
    for (const out of [out16, out24]) {
      expect(out[0]).toBeCloseTo(0.5, 3);
      expect(out[1]).toBeCloseTo(-0.25, 3);
      expect(out[2]).toBeCloseTo(-0.5, 3);
      expect(out[3]).toBeCloseTo(0.25, 3);
    }
  });

  it("clips out-of-range samples instead of wrapping", () => {
    const hot = new Float32Array([1.8, -1.8, 1.8, -1.8]);
    expect([...unpackPcm16(packPcm16(hot, 2))]).toEqual([1, -1, 1, -1]);
    expect([...unpackPcm24(packPcm24(hot, 2))]).toEqual([1, -1, 1, -1]);
  });
});
