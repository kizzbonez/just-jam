/**
 * Turns received payloads into planar float audio for a playback worklet.
 * PCM is unpacked in place; Opus goes through a WebCodecs AudioDecoder, whose
 * output is asynchronous, so concealment requests are queued alongside the
 * chunks they precede to keep everything in order.
 */
import type { CodecValue } from "@/features/studio/audio-profile";
import type { PlaybackCommand } from "@/features/studio/engine/messages";
import { unpackPcm16, unpackPcm24 } from "@/features/studio/engine/pcm";
import type { AudioPacket } from "@/features/studio/engine/wire";
import { DECODER_CONFIG } from "@/features/studio/engine/worker/opus-config";

type Post = (command: PlaybackCommand, transfer?: Transferable[]) => void;

const POOL_LIMIT = 16;

export class Decoder {
  private opus: AudioDecoder | null = null;
  private codec: CodecValue | null = null;
  /** Concealment owed before each chunk currently inside the Opus decoder. */
  private concealQueue: number[] = [];
  private pool: Float32Array<ArrayBuffer>[] = [];
  private chunkClock = 0;

  constructor(private readonly post: Post) {}

  decode(packet: AudioPacket, concealSamples: number): void {
    if (packet.codec !== this.codec) this.switchCodec(packet.codec);
    if (packet.codec === "OPUS") {
      this.decodeOpus(packet.payload, concealSamples);
      return;
    }
    if (concealSamples > 0) this.post({ conceal: concealSamples });
    const planar = (packet.codec === "PCM16" ? unpackPcm16 : unpackPcm24)(packet.payload);
    this.post({ pcm: planar, frames: planar.length / 2 }, [planar.buffer]);
  }

  private switchCodec(codec: CodecValue): void {
    this.flush();
    this.codec = codec;
  }

  private ensureOpus(): AudioDecoder {
    if (this.opus && this.opus.state === "configured") return this.opus;
    this.opus = new AudioDecoder({
      output: (audio) => this.onDecoded(audio),
      // A decode error drops the decoder; the next packet builds a fresh one.
      error: () => {
        this.opus = null;
        this.concealQueue = [];
      },
    });
    this.opus.configure(DECODER_CONFIG);
    return this.opus;
  }

  private decodeOpus(payload: Uint8Array, concealSamples: number): void {
    const decoder = this.ensureOpus();
    this.concealQueue.push(concealSamples);
    // Every Opus packet decodes on its own, so each one is a key chunk.
    const chunk = new EncodedAudioChunk({
      type: "key",
      timestamp: this.chunkClock++,
      data: payload as Uint8Array<ArrayBuffer>,
    });
    decoder.decode(chunk);
  }

  private onDecoded(audio: AudioData): void {
    const conceal = this.concealQueue.shift() ?? 0;
    if (conceal > 0) this.post({ conceal });
    const frames = audio.numberOfFrames;
    const planar = this.take(frames * 2);
    const right = audio.numberOfChannels > 1 ? 1 : 0;
    audio.copyTo(planar.subarray(0, frames), { planeIndex: 0, format: "f32-planar" });
    audio.copyTo(planar.subarray(frames), { planeIndex: right, format: "f32-planar" });
    audio.close();
    this.post({ pcm: planar, frames }, [planar.buffer]);
  }

  private take(length: number): Float32Array<ArrayBuffer> {
    const index = this.pool.findIndex((item) => item.length === length);
    if (index < 0) return new Float32Array(length);
    return this.pool.splice(index, 1)[0];
  }

  /** The playback worklet returns buffers once their audio has been copied out. */
  recycle(buffer: ArrayBuffer): void {
    if (this.pool.length < POOL_LIMIT) this.pool.push(new Float32Array(buffer));
  }

  /** Drops anything in flight, for a codec change or a stream restart. */
  flush(): void {
    if (this.opus && this.opus.state !== "closed") this.opus.close();
    this.opus = null;
    this.concealQueue = [];
  }

  dispose(): void {
    this.flush();
    this.pool = [];
  }
}
