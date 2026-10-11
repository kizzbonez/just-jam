/**
 * Adaptive buffer tuning: picks how much audio to hold for one remote player.
 * Pure state in, state out, so it can be tested without audio or a network.
 *
 * The target is the sum of three things:
 *  - a structural floor: half a frame, plus the block of audio the sound card
 *    takes in one go, plus a little slack. Below it the buffer would run dry
 *    even on a perfect network. The block is one render quantum on some
 *    systems and 10 ms on others, and the floor has to know which;
 *  - the lateness that 99% of recent packets stayed under, plus a margin;
 *  - a penalty that jumps on every underrun and bleeds away while playback
 *    stays clean.
 *
 * It rises at once and falls slowly, because a buffer that is briefly too
 * large costs a few milliseconds while one that is too small is a dropout.
 *
 * The one exception is a stream that has just started. Nothing is known about
 * its timing yet, so it begins with generous headroom, and as soon as it has
 * been measured for a couple of seconds the target drops straight to what was
 * measured, instead of easing down for a quarter of a minute.
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
/** How long a new stream is measured before its starting headroom is cut. */
const SETTLE_SECONDS = 2;
/** Kept above the measured need at that moment, then released at the usual rate. */
const SETTLE_CUSHION_MS = 3;

export interface TunerState {
  targetMs: number;
  penaltyMs: number;
  /** Seconds until a new stream's starting headroom is cut. Zero once that has happened. */
  settleS: number;
}

export interface TunerInput {
  frameMs: number;
  /** How much audio the output device takes at a time, in ms. One render quantum when unset. */
  blockMs?: number;
  /** 99th percentile lateness of recent packets, in ms. */
  latenessMs: number;
  /** Underruns since the previous step. */
  underruns: number;
  /** Seconds since the previous step. */
  elapsedSeconds: number;
}

/**
 * The smallest buffer that can work for this frame size on a perfect link.
 * The output device empties the buffer one block at a time, so a whole block
 * has to be waiting whenever it asks.
 */
export function structuralFloorMs(frameMs: number, blockMs = QUANTUM_MS): number {
  return frameMs / 2 + Math.max(blockMs, QUANTUM_MS) + QUANTUM_MS * 0.6;
}

/**
 * Starts generously and lets the release rate bring it down. Before any
 * arrival timing has been measured, guessing low costs a dropout in the first
 * second, while guessing high costs a few extra milliseconds for a few seconds.
 */
export function initialTuner(frameMs: number, blockMs?: number): TunerState {
  const targetMs = structuralFloorMs(frameMs, blockMs) + INITIAL_HEADROOM_MS;
  return { targetMs, penaltyMs: 0, settleS: SETTLE_SECONDS };
}

export function stepTuner(state: TunerState, input: TunerInput): TunerState {
  const decayed = Math.max(0, state.penaltyMs - PENALTY_DECAY_MS_PER_S * input.elapsedSeconds);
  const penaltyMs = Math.min(MAX_PENALTY_MS, decayed + input.underruns * UNDERRUN_PENALTY_MS);
  const floor = structuralFloorMs(input.frameMs, input.blockMs);
  const wanted = floor + input.latenessMs * LATENESS_HEADROOM + MARGIN_MS + penaltyMs;
  const ceiling = Math.max(floor, MAX_BUFFER_MS);
  const settleS = Math.max(0, state.settleS - input.elapsedSeconds);
  const eased = state.targetMs - RELEASE_MS_PER_S * input.elapsedSeconds;
  // The measuring period of a new stream has just ended: go straight to what it needs.
  const settledNow = state.settleS > 0 && settleS === 0;
  const lowered = settledNow ? Math.min(eased, wanted + SETTLE_CUSHION_MS) : eased;
  // Up immediately, down no faster than the release rate.
  const targetMs = Math.min(ceiling, Math.max(wanted, lowered));
  return { targetMs, penaltyMs, settleS };
}

/** Manual mode: the player's value, held above the point where nothing can play. */
export function manualTargetMs(requestedMs: number): number {
  return Math.max(QUANTUM_MS + 0.2, Math.min(MAX_BUFFER_MS, requestedMs));
}

export const msToSamples = (ms: number) => Math.round((ms * SAMPLE_RATE) / 1000);
export const samplesToMs = (samples: number) => (samples * 1000) / SAMPLE_RATE;
