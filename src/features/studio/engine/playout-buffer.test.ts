import { describe, expect, it } from "vitest";
import { PlayoutBuffer } from "@/features/studio/engine/playout-buffer";

const QUANTUM = 128;
const FRAME = 240;

/** A frame whose samples continue a global ramp, so order and position are checkable. */
function rampFrame(start: number, frames = FRAME): Float32Array {
  const planar = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    planar[i] = (start + i) / 100_000;
    planar[frames + i] = -(start + i) / 100_000;
  }
  return planar;
}

function pull(buffer: PlayoutBuffer): { left: Float32Array; right: Float32Array } {
  const left = new Float32Array(QUANTUM);
  const right = new Float32Array(QUANTUM);
  buffer.read(left, right);
  return { left, right };
}

const silent = (block: Float32Array) => block.every((sample) => sample === 0);

/** Writes and reads in real-time proportion for `quanta` render quanta. */
function run(buffer: PlayoutBuffer, quanta: number, writeEvery = FRAME): Float32Array[] {
  const out: Float32Array[] = [];
  let written = 0;
  let owed = 0;
  for (let i = 0; i < quanta; i++) {
    owed += QUANTUM;
    while (owed >= writeEvery) {
      buffer.write(rampFrame(written, writeEvery), writeEvery);
      written += writeEvery;
      owed -= writeEvery;
    }
    out.push(pull(buffer).left);
  }
  return out;
}

describe("PlayoutBuffer", () => {
  it("stays silent until the target is buffered, then plays", () => {
    const buffer = new PlayoutBuffer(4096, 480);
    buffer.configure(480, FRAME);
    buffer.write(rampFrame(0), FRAME);
    expect(silent(pull(buffer).left)).toBe(true);
    buffer.write(rampFrame(FRAME), FRAME);
    const first = pull(buffer);
    expect(silent(first.left)).toBe(false);
    expect(buffer.takeStats().playing).toBe(true);
  });

  it("plays samples bit-exact and in order once the fade-in is over", () => {
    const buffer = new PlayoutBuffer(4096, 480);
    buffer.configure(480, FRAME);
    const blocks = run(buffer, 40);
    const played = blocks.filter((block) => !silent(block));
    const second = played[1];
    for (let i = 1; i < QUANTUM; i++) {
      expect(second[i] - second[i - 1]).toBeCloseTo(1 / 100_000, 9);
    }
    expect(buffer.takeStats()).toMatchObject({ underruns: 0, skips: 0, rate: 1 });
  });

  it("keeps left and right apart", () => {
    const buffer = new PlayoutBuffer(4096, 240);
    buffer.configure(240, FRAME);
    buffer.write(rampFrame(1000), FRAME);
    buffer.write(rampFrame(1240), FRAME);
    pull(buffer);
    const { left, right } = pull(buffer);
    expect(left[10]).toBeGreaterThan(0);
    expect(right[10]).toBeCloseTo(-left[10], 9);
  });

  it("fades out on an underrun, rebuffers and counts it", () => {
    const buffer = new PlayoutBuffer(4096, 240);
    buffer.configure(240, FRAME);
    buffer.write(rampFrame(0), FRAME);
    pull(buffer); // plays 128, 112 left
    const dry = pull(buffer).left;
    expect(dry[QUANTUM - 1]).toBe(0);
    const stats = buffer.takeStats();
    expect(stats.underruns).toBe(1);
    expect(stats.playing).toBe(false);
    expect(silent(pull(buffer).left)).toBe(true);
  });

  it("skips ahead when far more than the target is queued", () => {
    const buffer = new PlayoutBuffer(8192, 240);
    buffer.configure(240, FRAME);
    for (let i = 0; i < 12; i++) buffer.write(rampFrame(i * FRAME), FRAME);
    pull(buffer);
    const stats = buffer.takeStats();
    expect(stats.skips).toBe(1);
    expect(buffer.fill).toBeLessThanOrEqual(240 + FRAME);
  });

  it("drops the excess at once when asked to trim to a lowered target", () => {
    const buffer = new PlayoutBuffer(8192, 1440);
    buffer.configure(1440, FRAME);
    run(buffer, 1500);
    const before = buffer.takeStats();
    expect(Math.abs(before.fill - 1440)).toBeLessThan(200);
    // 14 ms less: below the margin that triggers a skip on its own.
    buffer.configure(768, FRAME);
    buffer.trim();
    run(buffer, 4);
    const after = buffer.takeStats();
    expect(after.skips).toBe(before.skips + 1);
    expect(after.playing).toBe(true);
    expect(after.underruns).toBe(before.underruns);
    expect(Math.abs(after.fill - 768)).toBeLessThan(200);
  });

  it("leaves the audio alone when there is nothing worth trimming", () => {
    const buffer = new PlayoutBuffer(8192, 960);
    buffer.configure(960, FRAME);
    buffer.trim();
    run(buffer, 1500);
    const before = buffer.takeStats();
    buffer.trim();
    run(buffer, 4);
    expect(buffer.takeStats().skips).toBe(before.skips);
  });

  it("speeds up slightly when the sender's clock runs fast", () => {
    const buffer = new PlayoutBuffer(8192, 480);
    buffer.configure(480, FRAME);
    // The sender delivers 0.1% more audio than is played back, which is
    // already ten times the drift of a typical pair of sound cards.
    let owed = 0;
    let written = 0;
    let fastest = 1;
    for (let i = 0; i < 12_000; i++) {
      owed += QUANTUM * 1.001;
      while (owed >= FRAME) {
        buffer.write(rampFrame(written), FRAME);
        written += FRAME;
        owed -= FRAME;
      }
      pull(buffer);
      fastest = Math.max(fastest, buffer.takeStats().rate);
    }
    expect(fastest).toBeGreaterThan(1);
    expect(fastest).toBeLessThanOrEqual(1.002);
    expect(buffer.fill).toBeLessThan(480 + 720);
    expect(buffer.takeStats()).toMatchObject({ underruns: 0, skips: 0 });
  });

  it("conceals a gap with a fade to silence and fades the next frame in", () => {
    // The target equals what gets queued, so the read rate stays at exactly 1.
    const buffer = new PlayoutBuffer(4096, FRAME * 3);
    buffer.configure(FRAME * 3, FRAME);
    const loud = new Float32Array(FRAME * 2).fill(0.5);
    buffer.write(loud, FRAME);
    buffer.conceal(FRAME);
    buffer.write(loud, FRAME);
    const out: number[] = [];
    for (let i = 0; i < 5; i++) out.push(...pull(buffer).left);
    const concealed = out.slice(FRAME, FRAME * 2);
    expect(concealed[10]).toBeGreaterThan(concealed[200]);
    expect(concealed[FRAME - 1]).toBe(0);
    expect(out[FRAME * 2]).toBe(0);
    expect(out[FRAME * 2 + 100]).toBeCloseTo(0.5, 6);
    expect(buffer.takeStats().concealed).toBe(FRAME);
  });

  it("survives the writer lapping the reader", () => {
    const buffer = new PlayoutBuffer(1024, 240);
    buffer.configure(240, FRAME);
    for (let i = 0; i < 10; i++) buffer.write(rampFrame(i * FRAME), FRAME);
    expect(buffer.fill).toBeLessThanOrEqual(1024);
    expect(() => pull(buffer)).not.toThrow();
  });
});
