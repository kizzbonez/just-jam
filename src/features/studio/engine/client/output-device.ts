/**
 * The playback side of the audio context: which device it plays on, how long
 * that device delays the sound, and how much audio it takes at a time.
 */
type SinkContext = AudioContext & { setSinkId?: (id: string) => Promise<void> };

export class OutputDevice {
  /** `onBlock` is told the device's block size, which sizes every player's buffer. */
  constructor(
    private readonly context: AudioContext,
    private readonly onBlock: (blockMs: number) => void,
  ) {}

  /** Output delay the browser reports for this device, in ms. */
  get latencyMs(): number {
    return (this.context.baseLatency + (this.context.outputLatency || 0)) * 1000;
  }

  /** Reports how much audio the device takes at a time. Call after anything that may change it. */
  report(): void {
    this.onBlock(this.context.baseLatency * 1000);
  }

  /** Routes playback to a device, or back to the system default with null. Rejects when refused. */
  async use(deviceId: string | null): Promise<void> {
    await (this.context as SinkContext).setSinkId?.(deviceId ?? "");
    this.report();
  }
}
