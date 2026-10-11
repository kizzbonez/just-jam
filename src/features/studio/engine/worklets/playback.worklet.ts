/**
 * Playback AudioWorklet: one instance per remote player. Decoded audio arrives
 * from the transport worker on a dedicated port and is played through that
 * player's jitter buffer. Buffer statistics go back the same way.
 */
import type { PlaybackCommand } from "@/features/studio/engine/messages";
import { PlayoutBuffer } from "@/features/studio/engine/playout-buffer";

const CAPACITY = 65_536;
/** Used only until the worker sends the first real target. */
const INITIAL_TARGET = 1440;
/** Report roughly every 50 ms. */
const STATS_EVERY = 2400;

class PlaybackProcessor extends AudioWorkletProcessor {
  private readonly buffer = new PlayoutBuffer(CAPACITY, INITIAL_TARGET);
  private link: MessagePort | null = null;
  private sinceStats = 0;

  constructor() {
    super();
    this.port.onmessage = (event) => {
      const port = (event.data as { port?: MessagePort }).port;
      if (!port) return;
      this.link = port;
      port.onmessage = (message) => this.handle(message.data as PlaybackCommand);
    };
  }

  private handle(command: PlaybackCommand): void {
    if ("pcm" in command) {
      this.buffer.write(command.pcm, command.frames);
      // Hand the buffer back so the worker can reuse it.
      this.link?.postMessage({ recycle: command.pcm.buffer }, [command.pcm.buffer]);
    } else if ("conceal" in command) {
      this.buffer.conceal(command.conceal);
    } else if ("target" in command) {
      this.buffer.configure(command.target, command.frame);
    } else if ("trim" in command) {
      this.buffer.trim();
    } else {
      this.buffer.reset();
    }
  }

  process(_inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0];
    const left = output[0];
    this.buffer.read(left, output[1] ?? left);
    this.sinceStats += left.length;
    if (this.sinceStats >= STATS_EVERY && this.link) {
      this.sinceStats = 0;
      this.link.postMessage({ stats: this.buffer.takeStats() });
    }
    return true;
  }
}

registerProcessor("tonelink-playback", PlaybackProcessor);
