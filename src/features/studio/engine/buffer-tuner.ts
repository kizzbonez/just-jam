/**
 * Adaptive buffer tuning: picks how much audio to hold for one remote player.
 * Pure state in, state out, so it can be tested without audio or a network.
 *
 * The target is the sum of three things:
 *  - a structural floor: half a frame plus about two render quanta, below
 *    which the buffer would run dry even on a perfect network;
 *  - the lateness that 99% of recent packets stayed under, plus a margin;
 *  - a penalty that jumps on every underrun and bleeds away while playback
 *    stays clean.
 *
 * It rises at once and falls slowly, because a buffer that is briefly too
 * large costs a few milliseconds while one that is too small is a dropout.
 */
import { MAX_BUFFER_MS, SAMPLE_RATE } from "@/features/studio/audio-profile";

const QUANTUM_MS = (128 / SAMPLE_RATE) * 1000;
const MARGIN_MS = 1;
const LATENESS_HEADROOM = 1.15;
const UNDERRUN_PENALTY_MS = 4;
const MAX_PENALTY_MS = 40;
const PENALTY_DECAY_MS_PER_S = 0.4;
const RELEASE_MS_PER_S = 1.5;
const INITIAL_HEADROOM_MS = 24;

export interface TunerState {
  targetMs: number;
  penaltyMs: number;
}

export interface TunerInput {
  frameMs: number;
  /** 99th percentile lateness of recent packets, in ms. */
  latenessMs: number;
  /** Underruns since the previous step. */
  underruns: number;
  /** Seconds since the previous step. */
  elapsedSeconds: number;
}

/** The smallest buffer that can work for this frame size on a perfect link. */
export function structuralFloorMs(frameMs: number): number {
  return frameMs / 2 + QUANTUM_MS * 1.6;
}

/**
 * Starts generously and lets the release rate bring it down. Before any
 * arrival timing has been measured, guessing low costs a dropout in the first
 * second, while guessing high costs a few extra milliseconds for a few seconds.
 */
export function initialTuner(frameMs: number): TunerState {
  return { targetMs: structuralFloorMs(frameMs) + INITIAL_HEADROOM_MS, penaltyMs: 0 };
}

export function stepTuner(state: TunerState, input: TunerInput): TunerState {
  const decayed = Math.max(0, state.penaltyMs - PENALTY_DECAY_MS_PER_S * input.elapsedSeconds);
  const penaltyMs = Math.min(MAX_PENALTY_MS, decayed + input.underruns * UNDERRUN_PENALTY_MS);
  const floor = structuralFloorMs(input.frameMs);
  const wanted = floor + input.latenessMs * LATENESS_HEADROOM + MARGIN_MS + penaltyMs;
  const ceiling = Math.max(floor, MAX_BUFFER_MS);
  const release = state.targetMs - RELEASE_MS_PER_S * input.elapsedSeconds;
  // Up immediately, down no faster than the release rate.
  const targetMs = Math.min(ceiling, Math.max(wanted, release));
  return { targetMs, penaltyMs };
}

/** Manual mode: the player's value, held above the point where nothing can play. */
export function manualTargetMs(requestedMs: number): number {
  return Math.max(QUANTUM_MS + 0.2, Math.min(MAX_BUFFER_MS, requestedMs));
}

export const msToSamples = (ms: number) => Math.round((ms * SAMPLE_RATE) / 1000);
export const samplesToMs = (samples: number) => (samples * 1000) / SAMPLE_RATE;
