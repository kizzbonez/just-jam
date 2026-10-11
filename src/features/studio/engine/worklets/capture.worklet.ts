/**
 * Capture AudioWorklet. Runs on the audio rendering thread, right behind the
 * interface input. It routes the two input channels, cuts the stream into
 * codec frames and hands each frame straight to the transport worker over a
 * dedicated port, so the page's main thread is never in the audio path.
 */
import type { ChannelModeValue } from "@/features/studio/audio-profile";
import type { CaptureConfig, CaptureFrame } from "@/features/studio/engine/messages";

const POOL_LIMIT = 8;

class CaptureProcessor extends AudioWorkletProcessor {
  private frame = 240;
  private mode: ChannelModeValue = "STEREO";
  private sending = false;
  private sink: MessagePort | null = null;
  private current: Float32Array = new Float32Array(480);
  private pool: Float32Array[] = [];
  private fill = 0;
  /** Samples seen since start. Keeps counting while muted, so it tracks real time. */
  private clock = 0;
  private fresh = true;

  constructor() {
    super();
    this.port.onmessage = (event) => this.configure(event.data as CaptureConfig);
  }

  private configure(config: CaptureConfig): void {
    if (config.port) {
      this.sink = config.port;
      this.sink.onmessage = (event) => this.recycle(event.data as ArrayBuffer);
    }
    if (config.mode) this.mode = config.mode;
    if (config.frame && config.frame !== this.frame) {
      this.frame = config.frame;
      this.pool = [];
      this.current = new Float32Array(config.frame * 2);
      this.fill = 0;
    }
    if (config.sending !== undefined && config.sending !== this.sending) {
      this.sending = config.sending;
      this.fill = 0;
      this.fresh = true;
    }
  }

  /** The worker sends buffers back once encoded, so steady state allocates nothing. */
  private recycle(buffer: ArrayBuffer): void {
    if (buffer.byteLength === this.frame * 8 && this.pool.length < POOL_LIMIT) {
      this.pool.push(new Float32Array(buffer));
    }
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const left = input?.[0];
    if (left && this.sending && this.sink) this.collect(left, input[1] ?? left);
    this.clock += left?.length ?? 128;
    return true;
  }

  private collect(left: Float32Array, right: Float32Array): void {
    const frame = this.frame;
    for (let i = 0; i < left.length; i++) {
      let a = left[i];
      let b = right[i];
      if (this.mode === "MONO_LEFT") b = a;
      else if (this.mode === "MONO_RIGHT") a = b;
      else if (this.mode === "MONO_SUM") a = b = (a + b) * 0.5;
      this.current[this.fill] = a;
      this.current[frame + this.fill] = b;
      if (++this.fill === frame) this.flush(this.clock + i + 1 - frame);
    }
  }

  private flush(timestamp: number): void {
    const planar = this.current;
    const message: CaptureFrame = { timestamp, planar, fresh: this.fresh };
    this.sink?.postMessage(message, [planar.buffer]);
    this.current = this.pool.pop() ?? new Float32Array(this.frame * 2);
    this.fill = 0;
    this.fresh = false;
  }
}

registerProcessor("tonelink-capture", CaptureProcessor);
