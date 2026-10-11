/**
 * Reverb and echo on the local input, run beside the untouched signal:
 *
 *   input -+------------------------------------+-> output  (sent and metered)
 *          +-> send -> convolver ------+-> wet -+
 *          +-> send -> delay <-> feedback -+    +-> monitor, when it plays effects only
 *
 * The dry path is a plain wire, so the effects add no latency to what is
 * played. An effect at zero is unplugged from the input and costs nothing.
 * The settings are remembered in this browser.
 */
import {
  coerceFx,
  DEFAULT_FX,
  REVERB_SECONDS,
  reverbTail,
  type FxSettings,
  type ReverbSize,
} from "@/features/studio/engine/fx";

const STORAGE_KEY = "tonelink.fx";
const RAMP_SECONDS = 0.03;
/** Trims on the sends, so that full level sits beside the dry signal instead of over it. */
const REVERB_TRIM = 0.8;
const ECHO_TRIM = 0.7;

function loadSettings(): FxSettings {
  try {
    return coerceFx(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return DEFAULT_FX;
  }
}

function saveSettings(settings: FxSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage is full or blocked. The effects still work for this session.
  }
}

export class InputFx {
  readonly input: GainNode;
  readonly output: GainNode;
  /** The effects alone, without the dry signal. */
  readonly wet: GainNode;
  private readonly reverbSend: GainNode;
  private readonly convolver: ConvolverNode;
  private readonly echoSend: GainNode;
  private readonly delay: DelayNode;
  private readonly feedback: GainNode;
  private settings = loadSettings();
  private room: ReverbSize | null = null;
  /** Sends that are plugged into the input right now. */
  private readonly plugged = new Set<GainNode>();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly context: AudioContext) {
    this.input = context.createGain();
    this.output = context.createGain();
    this.wet = context.createGain();
    this.reverbSend = context.createGain();
    this.convolver = context.createConvolver();
    this.echoSend = context.createGain();
    this.delay = context.createDelay(1);
    this.feedback = context.createGain();
    this.input.connect(this.output);
    this.reverbSend.connect(this.convolver).connect(this.wet);
    this.echoSend.connect(this.delay).connect(this.wet);
    this.delay.connect(this.feedback).connect(this.delay);
    this.wet.connect(this.output);
    this.apply();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get = (): FxSettings => this.settings;

  set(patch: Partial<FxSettings>): void {
    this.settings = coerceFx({ ...this.settings, ...patch });
    saveSettings(this.settings);
    this.apply();
    for (const listener of this.listeners) listener();
  }

  private apply(): void {
    const { reverb, reverbSize, echo, echoMs, echoRepeats } = this.settings;
    const now = this.context.currentTime;
    if (reverb > 0) this.loadRoom(reverbSize);
    this.patch(this.reverbSend, reverb * REVERB_TRIM);
    this.patch(this.echoSend, echo * ECHO_TRIM);
    this.delay.delayTime.setTargetAtTime(echoMs / 1000, now, RAMP_SECONDS);
    this.feedback.gain.setTargetAtTime(echoRepeats, now, RAMP_SECONDS);
  }

  /** Sets a send's level, and unplugs it from the input while it is at zero. */
  private patch(send: GainNode, level: number): void {
    send.gain.setTargetAtTime(level, this.context.currentTime, RAMP_SECONDS);
    if (level > 0 && !this.plugged.has(send)) {
      this.input.connect(send);
      this.plugged.add(send);
    } else if (level === 0 && this.plugged.delete(send)) {
      this.input.disconnect(send);
    }
  }

  /** Builds the room's impulse response the first time that room is used. */
  private loadRoom(size: ReverbSize): void {
    if (size === this.room) return;
    const { sampleRate } = this.context;
    const tails = [0, 1].map(() => reverbTail(REVERB_SECONDS[size], sampleRate, Math.random));
    const buffer = this.context.createBuffer(2, tails[0].length, sampleRate);
    tails.forEach((tail, channel) => buffer.getChannelData(channel).set(tail));
    this.convolver.buffer = buffer;
    this.room = size;
  }
}
