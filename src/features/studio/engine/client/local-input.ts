/**
 * The local half of the audio graph:
 *
 *   interface -> source -+-> capture worklet (frames to the worker)
 *                        +-> tap             (input meters and scope)
 *                        +-> monitor gain -> speakers (optional)
 */
import { frameSamples, type ChannelModeValue } from "@/features/studio/audio-profile";
import { inputLatencyMs, openInput } from "@/features/studio/engine/client/capture";
import { SignalTap } from "@/features/studio/engine/client/signal-tap";
import type { CaptureConfig } from "@/features/studio/engine/messages";

export class LocalInput {
  readonly tap: SignalTap;
  private readonly capture: AudioWorkletNode;
  private readonly monitor: GainNode;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  latencyMs = 0;

  constructor(
    private readonly context: AudioContext,
    workerPort: MessagePort,
  ) {
    this.capture = new AudioWorkletNode(context, "tonelink-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 2,
      channelCountMode: "explicit",
      // A one-channel source is spread to both sides instead of landing on the left only.
      channelInterpretation: "speakers",
    });
    this.configure({ port: workerPort }, [workerPort]);
    this.tap = new SignalTap(context);
    this.monitor = context.createGain();
    this.monitor.gain.value = 0;
    this.monitor.connect(context.destination);
  }

  private configure(config: CaptureConfig, transfer: Transferable[] = []): void {
    this.capture.port.postMessage(config, transfer);
  }

  /** Opens the device and wires it in. Replaces any input already open. */
  async open(deviceId: string | null): Promise<{ deviceId: string | null; label: string | null }> {
    const stream = await openInput(deviceId);
    this.close();
    this.stream = stream;
    this.latencyMs = inputLatencyMs(stream);
    this.source = this.context.createMediaStreamSource(stream);
    this.source.connect(this.capture);
    this.source.connect(this.tap.input);
    this.source.connect(this.monitor);
    const track = stream.getAudioTracks()[0];
    return { deviceId: track?.getSettings().deviceId ?? deviceId, label: track?.label ?? null };
  }

  /** Called when the device disappears, for example when it is unplugged. */
  onEnded(handler: () => void): void {
    this.stream?.getAudioTracks()[0]?.addEventListener("ended", handler, { once: true });
  }

  setSending(sending: boolean): void {
    this.configure({ sending });
  }

  setFormat(frameMicros: number, mode: ChannelModeValue): void {
    this.configure({ frame: frameSamples(frameMicros), mode });
  }

  setMonitor(on: boolean): void {
    this.monitor.gain.setTargetAtTime(on ? 1 : 0, this.context.currentTime, 0.01);
  }

  close(): void {
    this.configure({ sending: false });
    this.source?.disconnect();
    this.source = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
