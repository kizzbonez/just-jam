/**
 * Receive side for one remote player: orders packets, measures their arrival,
 * decodes them, feeds that player's playback worklet and tunes its buffer.
 */
import { frameSamples } from "@/features/studio/audio-profile";
import {
  initialTuner,
  manualTargetMs,
  msToSamples,
  samplesToMs,
  stepTuner,
  type TunerState,
} from "@/features/studio/engine/buffer-tuner";
import { JitterEstimator } from "@/features/studio/engine/jitter";
import type {
  BufferSetting,
  PeerStats,
  PlaybackCommand,
} from "@/features/studio/engine/messages";
import type { PlayoutStats } from "@/features/studio/engine/playout-buffer";
import { type AudioPacket, FLAG_DISCONTINUITY, sequenceGap } from "@/features/studio/engine/wire";
import { Decoder } from "@/features/studio/engine/worker/decoder";

/** A longer gap than this is a restart, not something to paper over. */
const MAX_CONCEAL_PACKETS = 6;
const RETARGET_STEP_MS = 0.25;

/** Stands in until the playback worklet has sent its first report. */
const IDLE_PLAYOUT: PlayoutStats = {
  fill: 0,
  minFill: 0,
  playing: false,
  underruns: 0,
  skips: 0,
  concealed: 0,
  rate: 1,
};

/** What a receiver knows on its own. The path the packets took is added above it. */
export type ReceiverStats = Omit<PeerStats, "route" | "p2pRttMs">;

interface Counters {
  received: number;
  lost: number;
  late: number;
  bytes: number;
}

export class Receiver {
  private readonly jitter = new JitterEstimator();
  private readonly decoder: Decoder;
  private expected: number | null = null;
  private frameMs = 5;
  /** How much audio the output device takes at a time, when the page has reported it. */
  private blockMs: number | undefined;
  private tuner: TunerState = initialTuner(5);
  private sentTargetMs = -1;
  private playout: PlayoutStats = IDLE_PLAYOUT;
  private seenUnderruns = 0;
  private total: Counters = { received: 0, lost: 0, late: 0, bytes: 0 };
  private last: Counters = { ...this.total };
  private lossPct = 0;

  constructor(
    readonly slot: number,
    private readonly port: MessagePort,
    private buffer: BufferSetting,
  ) {
    this.decoder = new Decoder((command, transfer) => port.postMessage(command, transfer ?? []));
    port.onmessage = (event) => this.fromWorklet(event.data as WorkletMessage);
  }

  private fromWorklet(message: WorkletMessage): void {
    if (message.stats) this.playout = message.stats;
    if (message.recycle) this.decoder.recycle(message.recycle);
  }

  setBuffer(buffer: BufferSetting): void {
    this.buffer = buffer;
  }

  setOutputBlock(blockMs: number | undefined): void {
    this.blockMs = blockMs;
  }

  push(packet: AudioPacket, arrivalMs: number): void {
    const frameMs = packet.frameMicros / 1000;
    const restart = this.expected === null || (packet.flags & FLAG_DISCONTINUITY) !== 0;
    if (restart || frameMs !== this.frameMs) this.restart(packet, frameMs);
    const gap = sequenceGap(packet.sequence, this.expected ?? packet.sequence);
    if (gap < 0) {
      this.total.late++;
      return;
    }
    let conceal = 0;
    if (gap > MAX_CONCEAL_PACKETS) this.restart(packet, frameMs);
    else if (gap > 0) {
      this.total.lost += gap;
      conceal = gap * frameSamples(packet.frameMicros);
    }
    this.expected = (packet.sequence + 1) & 0xffff;
    this.jitter.update(packet.timestamp, arrivalMs);
    this.total.received++;
    this.total.bytes += packet.payload.byteLength;
    this.decoder.decode(packet, conceal);
  }

  /** The packets now come by another path: treat the next one as a new stream. */
  rebase(): void {
    this.expected = null;
  }

  /** A new stream, or a break in one: start timing and buffering from scratch. */
  private restart(packet: AudioPacket, frameMs: number): void {
    this.expected = packet.sequence;
    this.jitter.reset();
    this.decoder.flush();
    this.post({ reset: true });
    this.frameMs = frameMs;
    // Arrival timing is unknown again, so fall back to the generous starting
    // buffer and tell the worklet now, not at the next stats tick.
    const fresh = initialTuner(frameMs, this.blockMs);
    const targetMs = Math.max(this.tuner.targetMs, fresh.targetMs);
    this.tuner = { ...this.tuner, targetMs, settleS: fresh.settleS };
    this.sendTarget(this.currentTarget());
  }

  private currentTarget(): number {
    return this.buffer.mode === "MANUAL" ? manualTargetMs(this.buffer.ms) : this.tuner.targetMs;
  }

  private sendTarget(targetMs: number): void {
    this.sentTargetMs = targetMs;
    this.post({ target: msToSamples(targetMs), frame: msToSamples(this.frameMs) });
  }

  private post(command: PlaybackCommand): void {
    this.port.postMessage(command);
  }

  /** Runs the buffer tuner and reports this player's telemetry. */
  tick(elapsedSeconds: number): ReceiverStats {
    const { underruns, fill, skips, playing, rate } = this.playout;
    const latenessMs = this.jitter.latenessQuantile(0.99);
    const settling = this.tuner.settleS > 0;
    const targetMs = this.nextTarget(latenessMs, underruns - this.seenUnderruns, elapsedSeconds);
    this.seenUnderruns = underruns;
    if (Math.abs(targetMs - this.sentTargetMs) >= RETARGET_STEP_MS) this.sendTarget(targetMs);
    // The starting headroom has just been cut: drop the audio queued beyond the new target.
    if (settling && this.tuner.settleS === 0) this.post({ trim: true });
    const delta = this.rollCounters();
    this.trackLoss(delta);
    return {
      slot: this.slot,
      jitterMs: this.jitter.jitterMs,
      latenessMs,
      lossPct: this.lossPct,
      latePackets: this.total.late,
      bufferMs: samplesToMs(fill),
      targetMs,
      underruns,
      skips,
      receivedKbps: (delta.bytes * 8) / 1000 / Math.max(elapsedSeconds, 0.001),
      playing,
      rate,
    };
  }

  private trackLoss(delta: Counters): void {
    const expected = delta.received + delta.lost;
    if (expected > 0) this.lossPct += ((delta.lost / expected) * 100 - this.lossPct) * 0.3;
  }

  private nextTarget(latenessMs: number, underruns: number, elapsedSeconds: number): number {
    if (this.buffer.mode === "AUTO") {
      const { frameMs, blockMs } = this;
      const input = { frameMs, blockMs, latenessMs, underruns, elapsedSeconds };
      this.tuner = stepTuner(this.tuner, input);
    }
    return this.currentTarget();
  }

  private rollCounters(): Counters {
    const delta = {
      received: this.total.received - this.last.received,
      lost: this.total.lost - this.last.lost,
      late: this.total.late - this.last.late,
      bytes: this.total.bytes - this.last.bytes,
    };
    this.last = { ...this.total };
    return delta;
  }

  dispose(): void {
    this.decoder.dispose();
    this.port.onmessage = null;
    this.port.close();
  }
}

interface WorkletMessage {
  stats?: PlayoutStats;
  recycle?: ArrayBuffer;
}
