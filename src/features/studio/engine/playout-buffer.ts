/**
 * The receive-side jitter buffer. It runs inside the playback AudioWorklet,
 * one instance per remote player, and replaces WebRTC's NetEQ with something
 * small and tunable:
 *
 *  - decoded audio is written into a ring and read back one render quantum at
 *    a time;
 *  - playback waits until the ring holds `target` samples, so the target is the
 *    latency this stage adds;
 *  - when the ring runs dry it fades out, refills to the target and resumes;
 *  - when it drifts from the target (two sound cards never run at exactly the
 *    same rate) the read speed is nudged by at most 0.2%, about 3.5 cents,
 *    which is below what a listener hears as a change of pitch;
 *  - when it is far over the target after a network stall, or when the target
 *    has just been cut, the excess is dropped with a short crossfade so latency
 *    cannot linger.
 *
 * The audio path does not allocate.
 */
import { hermite } from "@/features/studio/engine/interpolate";

const FADE = 48;
const MAX_RATE_OFFSET = 0.002;
/** How hard the read rate pulls the fill back to the target, per second. */
const DRIFT_GAIN = 0.35;
const FILL_SMOOTHING = 0.004;
/** Samples kept in hand so interpolation never reads past the writer. */
const GUARD = 4;

export interface PlayoutStats {
  /** Smoothed samples waiting to be played. */
  fill: number;
  /** Lowest fill seen since the last call to takeStats. */
  minFill: number;
  playing: boolean;
  underruns: number;
  skips: number;
  concealed: number;
  rate: number;
}

export class PlayoutBuffer {
  private readonly left: Float32Array;
  private readonly right: Float32Array;
  private readonly mask: number;
  private writeIndex = 0;
  /** Fractional read position, always behind writeIndex. */
  private readPos = 0;
  private playing = false;
  private fadeLeft = 0;
  /** Where the audio being faded out continues from, during a skip crossfade. */
  private fadeFrom = -1;
  private fadeNextWrite = false;
  private smoothFill = 0;
  private minFill = Infinity;
  private underruns = 0;
  private skips = 0;
  private concealed = 0;
  private rate = 1;
  private target: number;
  private skipMargin = 960;
  private deadband = 120;

  /** `capacity` must be a power of two. */
  constructor(capacity: number, target: number) {
    this.left = new Float32Array(capacity);
    this.right = new Float32Array(capacity);
    this.mask = capacity - 1;
    this.target = target;
  }

  get fill(): number {
    return this.writeIndex - this.readPos;
  }

  /** `frameSamples` sizes the tolerances: audio arrives in steps of one frame. */
  configure(target: number, frameSamples: number): void {
    this.target = target;
    this.deadband = Math.max(frameSamples / 2, 64);
    this.skipMargin = Math.max(frameSamples * 2, 720);
  }

  reset(): void {
    this.readPos = this.writeIndex;
    this.playing = false;
    this.smoothFill = 0;
    this.rate = 1;
    this.fadeFrom = -1;
  }

  /** Appends `frames` samples of planar audio (left block, then right block). */
  write(planar: Float32Array, frames: number): void {
    const fade = this.fadeNextWrite ? Math.min(FADE, frames) : 0;
    for (let i = 0; i < frames; i++) {
      const gain = i < fade ? i / fade : 1;
      const index = (this.writeIndex + i) & this.mask;
      this.left[index] = planar[i] * gain;
      this.right[index] = planar[frames + i] * gain;
    }
    this.fadeNextWrite = false;
    this.advanceWrite(frames);
  }

  /**
   * Stands in for lost packets: repeats the most recent audio while fading it
   * to silence, which hides a short gap far better than a hard cut.
   */
  conceal(frames: number): void {
    for (let i = 0; i < frames; i++) {
      const gain = 1 - (i + 1) / frames;
      const from = (this.writeIndex - frames + i) & this.mask;
      const to = (this.writeIndex + i) & this.mask;
      this.left[to] = this.left[from] * gain;
      this.right[to] = this.right[from] * gain;
    }
    this.concealed += frames;
    this.fadeNextWrite = true;
    this.advanceWrite(frames);
  }

  private advanceWrite(frames: number): void {
    this.writeIndex += frames;
    if (this.fill > this.mask - GUARD) {
      // The writer lapped the reader: keep only the newest audio.
      this.readPos = this.writeIndex - this.target;
      this.fadeFrom = -1;
      this.skips++;
    }
  }

  /** Fills one render quantum. Outputs silence while buffering. */
  read(outLeft: Float32Array, outRight: Float32Array): void {
    const frames = outLeft.length;
    if (!this.playing && !this.start(frames)) {
      outLeft.fill(0);
      outRight.fill(0);
      return;
    }
    this.steer(frames);
    if (this.fill < frames * this.rate + GUARD) {
      this.underrun(outLeft, outRight);
      return;
    }
    this.render(outLeft, outRight);
    this.track();
  }

  private start(frames: number): boolean {
    if (this.fill < Math.max(this.target, frames + GUARD)) return false;
    this.playing = true;
    this.fadeLeft = FADE;
    this.smoothFill = this.fill;
    return true;
  }

  /** Chooses the read rate, or jumps ahead when far too much is queued. */
  private steer(frames: number): void {
    // Judged on the smoothed fill: a burst of arrivals between two reads is
    // normal, audio piling up for a third of a second is not.
    if (this.smoothFill - this.target > this.skipMargin) {
      this.jumpTo(this.target + frames);
      this.smoothFill = this.fill;
      return;
    }
    const error = this.smoothFill - this.target;
    if (Math.abs(error) <= this.deadband) {
      // Back on target: return to copying samples untouched.
      if (this.rate !== 1) this.readPos = Math.round(this.readPos);
      this.rate = 1;
      return;
    }
    const offset = (error / 48_000) * DRIFT_GAIN;
    this.rate = 1 + Math.max(-MAX_RATE_OFFSET, Math.min(MAX_RATE_OFFSET, offset));
  }

  /** Moves the reader ahead so that `keep` samples stay queued, crossfading from where it was. */
  private jumpTo(keep: number): void {
    this.fadeFrom = Math.round(this.readPos);
    this.readPos = this.writeIndex - keep;
    this.fadeLeft = FADE;
    this.rate = 1;
    this.skips++;
  }

  /**
   * Drops what is queued beyond the target right away, where the read rate
   * would take seconds to work it off. Measured on the smoothed fill, so the
   * arrival of a burst just before the call does not count as excess.
   */
  trim(): void {
    const excess = Math.round(this.smoothFill - this.target);
    if (!this.playing || excess <= this.deadband) return;
    this.jumpTo(this.fill - excess);
    this.smoothFill = this.target;
  }

  private render(outLeft: Float32Array, outRight: Float32Array): void {
    const exact = this.rate === 1;
    for (let i = 0; i < outLeft.length; i++) {
      const index = this.readPos & this.mask;
      let l = exact ? this.left[index] : hermite(this.left, this.mask, this.readPos);
      let r = exact ? this.right[index] : hermite(this.right, this.mask, this.readPos);
      if (this.fadeLeft > 0) {
        const gain = 1 - this.fadeLeft-- / FADE;
        const old = this.fadeFrom < 0 ? -1 : this.fadeFrom++ & this.mask;
        l = l * gain + (old < 0 ? 0 : this.left[old] * (1 - gain));
        r = r * gain + (old < 0 ? 0 : this.right[old] * (1 - gain));
        if (this.fadeLeft === 0) this.fadeFrom = -1;
      }
      outLeft[i] = l;
      outRight[i] = r;
      this.readPos += this.rate;
    }
  }

  /** Plays out what is left with a fade, then goes back to buffering. */
  private underrun(outLeft: Float32Array, outRight: Float32Array): void {
    const available = Math.max(0, Math.floor(this.fill) - 2);
    const start = Math.floor(this.readPos);
    for (let i = 0; i < outLeft.length; i++) {
      const gain = i < available ? 1 - (i + 1) / available : 0;
      const index = (start + i) & this.mask;
      outLeft[i] = gain > 0 ? this.left[index] * gain : 0;
      outRight[i] = gain > 0 ? this.right[index] * gain : 0;
    }
    this.underruns++;
    this.reset();
    this.minFill = 0;
  }

  private track(): void {
    const fill = this.fill;
    this.smoothFill += (fill - this.smoothFill) * FILL_SMOOTHING;
    if (fill < this.minFill) this.minFill = fill;
  }

  /** Reads the counters and starts a new minimum-fill window. */
  takeStats(): PlayoutStats {
    const stats = {
      fill: this.playing ? this.smoothFill : this.fill,
      minFill: Number.isFinite(this.minFill) ? this.minFill : this.fill,
      playing: this.playing,
      underruns: this.underruns,
      skips: this.skips,
      concealed: this.concealed,
      rate: this.rate,
    };
    this.minFill = Infinity;
    return stats;
  }
}
