/**
 * Send side: turns frames from the capture worklet into audio datagrams.
 * Opus goes through a WebCodecs AudioEncoder; PCM is packed directly.
 */
import { CHANNELS, frameSamples, SAMPLE_RATE } from "@/features/studio/audio-profile";
import type { CaptureFrame, TransportProfile } from "@/features/studio/engine/messages";
import { packPcm16, packPcm24 } from "@/features/studio/engine/pcm";
import { encodeAudio, FLAG_DISCONTINUITY } from "@/features/studio/engine/wire";
import { pickEncoderConfig } from "@/features/studio/engine/worker/opus-config";

const MICROS_PER_SAMPLE = 1_000_000 / SAMPLE_RATE;

export class Sender {
  private encoder: AudioEncoder | null = null;
  private profile: TransportProfile | null = null;
  private sequence = 0;
  private discontinuity = true;
  /** Raised while a new encoder is being set up, so stale frames are skipped. */
  private generation = 0;
  bytes = 0;
  packets = 0;

  constructor(
    private readonly send: (datagram: Uint8Array) => void,
    private readonly fail: (message: string) => void,
  ) {}

  async configure(profile: TransportProfile): Promise<void> {
    const generation = ++this.generation;
    this.closeEncoder();
    this.profile = null;
    if (profile.codec === "OPUS") {
      const config = await pickEncoderConfig(profile);
      if (generation !== this.generation) return;
      this.encoder = new AudioEncoder({
        output: (chunk) => this.onEncoded(chunk),
        error: (error) => this.fail(`Encoder failed: ${error.message}`),
      });
      this.encoder.configure(config);
    }
    this.profile = profile;
    this.discontinuity = true;
  }

  /** Accepts one capture frame. Frames of the wrong size are from an old setting. */
  push(frame: CaptureFrame): void {
    const profile = this.profile;
    if (!profile) return;
    const frames = frameSamples(profile.frameMicros);
    if (frame.planar.length !== frames * CHANNELS) return;
    if (frame.fresh) this.discontinuity = true;
    if (profile.codec === "OPUS") this.encode(frame, frames);
    else {
      const pack = profile.codec === "PCM16" ? packPcm16 : packPcm24;
      this.emit(frame.timestamp, pack(frame.planar, frames));
    }
  }

  private encode(frame: CaptureFrame, frames: number): void {
    if (!this.encoder || this.encoder.state !== "configured") return;
    const data = new AudioData({
      format: "f32-planar",
      sampleRate: SAMPLE_RATE,
      numberOfFrames: frames,
      numberOfChannels: CHANNELS,
      timestamp: Math.round(frame.timestamp * MICROS_PER_SAMPLE),
      data: frame.planar as Float32Array<ArrayBuffer>,
    });
    this.encoder.encode(data);
    data.close();
  }

  private onEncoded(chunk: EncodedAudioChunk): void {
    const payload = new Uint8Array(chunk.byteLength);
    chunk.copyTo(payload);
    this.emit(Math.round(chunk.timestamp / MICROS_PER_SAMPLE), payload);
  }

  private emit(timestamp: number, payload: Uint8Array): void {
    const profile = this.profile;
    if (!profile) return;
    const header = {
      codec: profile.codec,
      frameMicros: profile.frameMicros,
      flags: this.discontinuity ? FLAG_DISCONTINUITY : 0,
      sequence: this.sequence,
      timestamp,
    };
    this.send(encodeAudio(header, payload));
    this.sequence = (this.sequence + 1) & 0xffff;
    this.discontinuity = false;
    this.bytes += payload.byteLength;
    this.packets++;
  }

  private closeEncoder(): void {
    if (this.encoder && this.encoder.state !== "closed") this.encoder.close();
    this.encoder = null;
  }

  dispose(): void {
    this.generation++;
    this.closeEncoder();
    this.profile = null;
  }
}
