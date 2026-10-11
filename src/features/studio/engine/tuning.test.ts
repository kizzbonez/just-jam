import { describe, expect, it } from "vitest";
import {
  initialTuner,
  manualTargetMs,
  msToSamples,
  stepTuner,
  structuralFloorMs,
  type TunerState,
} from "@/features/studio/engine/buffer-tuner";
import { JitterEstimator } from "@/features/studio/engine/jitter";

const FRAME_SAMPLES = 240;
const FRAME_MS = 5;

/** Feeds packets that left on a perfect 5 ms cadence and arrived with `delays`. */
function feed(estimator: JitterEstimator, delays: number[], startMs = 10_000): void {
  delays.forEach((delay, index) => {
    estimator.update(index * FRAME_SAMPLES, startMs + index * FRAME_MS + delay);
  });
}

describe("JitterEstimator", () => {
  it("reports nothing to absorb on a perfectly steady stream", () => {
    const estimator = new JitterEstimator();
    feed(estimator, new Array<number>(400).fill(12));
    expect(estimator.jitterMs).toBeCloseTo(0, 6);
    expect(estimator.latenessQuantile(0.99)).toBeCloseTo(0, 6);
  });

  it("ignores the constant part of the delay", () => {
    const near = new JitterEstimator();
    const far = new JitterEstimator();
    const wobble = Array.from({ length: 400 }, (_, i) => (i % 4) * 0.5);
    feed(near, wobble.map((value) => value + 2));
    feed(far, wobble.map((value) => value + 180));
    expect(far.latenessQuantile(0.99)).toBeCloseTo(near.latenessQuantile(0.99), 6);
  });

  it("sizes the quantile from the late tail, not the average", () => {
    const estimator = new JitterEstimator();
    const delays = Array.from({ length: 500 }, (_, i) => (i % 25 === 0 ? 9 : 1));
    feed(estimator, delays);
    expect(estimator.latenessQuantile(0.5)).toBeCloseTo(0, 6);
    expect(estimator.latenessQuantile(0.99)).toBeCloseTo(8, 6);
  });

  it("handles the sender's sample clock wrapping", () => {
    const estimator = new JitterEstimator();
    const start = 4_294_967_296 - FRAME_SAMPLES * 3;
    for (let i = 0; i < 50; i++) {
      estimator.update((start + i * FRAME_SAMPLES) >>> 0, 5000 + i * FRAME_MS);
    }
    expect(estimator.latenessQuantile(0.99)).toBeCloseTo(0, 6);
  });

  it("starts over after a reset", () => {
    const estimator = new JitterEstimator();
    feed(estimator, [0, 20, 0, 20, 0, 20]);
    estimator.reset();
    expect(estimator.latenessQuantile(0.99)).toBe(0);
    expect(estimator.jitterMs).toBe(0);
  });
});

function settle(state: TunerState, latenessMs: number, seconds: number): TunerState {
  let next = state;
  for (let i = 0; i < seconds * 4; i++) {
    next = stepTuner(next, { frameMs: FRAME_MS, latenessMs, underruns: 0, elapsedSeconds: 0.25 });
  }
  return next;
}

describe("stepTuner", () => {
  it("settles near the structural floor on a clean link", () => {
    const state = settle(initialTuner(FRAME_MS), 0, 30);
    expect(state.targetMs).toBeGreaterThanOrEqual(structuralFloorMs(FRAME_MS));
    expect(state.targetMs).toBeLessThan(structuralFloorMs(FRAME_MS) + 2);
  });

  it("covers the measured lateness with headroom", () => {
    const state = settle(initialTuner(FRAME_MS), 12, 5);
    expect(state.targetMs).toBeGreaterThan(structuralFloorMs(FRAME_MS) + 12);
  });

  it("needs a whole output block in hand, whatever size the sound card takes", () => {
    // One render quantum at a time: the floor is unchanged from a plain worklet.
    expect(structuralFloorMs(FRAME_MS, 128 / 48)).toBeCloseTo(structuralFloorMs(FRAME_MS), 6);
    // 10 ms at a time, as Chrome plays on Windows: 2.5 ms frames still need 12.85 ms.
    expect(structuralFloorMs(2.5, 10)).toBeCloseTo(1.25 + 10 + 1.6, 6);
    expect(structuralFloorMs(2.5, 0)).toBeCloseTo(structuralFloorMs(2.5), 6);
  });

  it("starts above the larger floor instead of finding it through dropouts", () => {
    const step = { frameMs: 2.5, blockMs: 10, latenessMs: 6, underruns: 0, elapsedSeconds: 0.25 };
    let state = initialTuner(2.5, 10);
    for (let i = 0; i < 40; i++) state = stepTuner(state, step);
    expect(state.penaltyMs).toBe(0);
    expect(state.targetMs).toBeCloseTo(12.85 + 6 * 1.15 + 1, 2);
  });

  it("keeps a new stream's starting headroom while it is being measured", () => {
    const start = initialTuner(FRAME_MS);
    const early = settle(start, 2, 1.75);
    expect(early.settleS).toBeGreaterThan(0);
    expect(early.targetMs).toBeGreaterThan(structuralFloorMs(FRAME_MS) + 20);
  });

  it("cuts straight to the measured need once a new stream has been measured", () => {
    const need = structuralFloorMs(FRAME_MS) + 2 * 1.15 + 1;
    const settled = settle(initialTuner(FRAME_MS), 2, 2);
    expect(settled.settleS).toBe(0);
    // A few seconds of easing would still be about 20 ms above the floor here.
    expect(settled.targetMs).toBeLessThan(need + 3.5);
    expect(settled.targetMs).toBeGreaterThanOrEqual(need);
    expect(settle(settled, 2, 3).targetMs).toBeCloseTo(need, 5);
  });

  it("cuts only once: later rises still fall slowly", () => {
    const settled = settle(initialTuner(FRAME_MS), 0, 10);
    const step = { frameMs: FRAME_MS, underruns: 0, elapsedSeconds: 0.25 };
    const spiked = stepTuner(settled, { ...step, latenessMs: 30 });
    const after = settle(spiked, 0, 2);
    expect(spiked.targetMs - after.targetMs).toBeCloseTo(3, 1);
  });

  it("rises at once and falls slowly", () => {
    const calm = settle(initialTuner(FRAME_MS), 0, 30);
    const step = { frameMs: FRAME_MS, underruns: 0, elapsedSeconds: 0.25 };
    const spiked = stepTuner(calm, { ...step, latenessMs: 30 });
    expect(spiked.targetMs).toBeGreaterThan(calm.targetMs + 30);
    const after = stepTuner(spiked, { ...step, latenessMs: 0 });
    expect(spiked.targetMs - after.targetMs).toBeLessThan(1);
    expect(settle(spiked, 0, 60).targetMs).toBeCloseTo(calm.targetMs, 1);
  });

  it("adds a penalty for underruns that bleeds away", () => {
    const calm = settle(initialTuner(FRAME_MS), 0, 30);
    const hit = stepTuner(calm, {
      frameMs: FRAME_MS,
      latenessMs: 0,
      underruns: 2,
      elapsedSeconds: 0.25,
    });
    expect(hit.penaltyMs).toBeGreaterThan(7);
    expect(hit.targetMs).toBeGreaterThan(calm.targetMs + 7);
    expect(settle(hit, 0, 60).penaltyMs).toBe(0);
  });

  it("never exceeds the maximum buffer", () => {
    const state = settle(initialTuner(FRAME_MS), 5000, 2);
    expect(state.targetMs).toBeLessThanOrEqual(200);
  });
});

describe("manualTargetMs", () => {
  it("honours the request within playable bounds", () => {
    expect(manualTargetMs(25)).toBe(25);
    expect(manualTargetMs(0)).toBeGreaterThan(2.6);
    expect(manualTargetMs(900)).toBe(200);
    expect(msToSamples(10)).toBe(480);
  });
});
