/**
 * The local half of the audio graph:
 *
 *   interface -> source -> effects -+-> capture worklet (frames to the worker)
 *                                   +-> tap             (input meters and scope)
 *                                   +-> monitor gain -> speakers (optional)
 *
 * Monitor can play everything that is sent, or the effects alone.
 */
import { frameSamples, type ChannelModeValue } from "@/features/studio/audio-profile";
import { inputLatencyMs, openInput } from "@/features/studio/engine/client/capture";
import { InputFx } from "@/features/studio/engine/client/input-fx";
import { SignalTap } from "@/features/studio/engine/client/signal-tap";
import type { CaptureConfig } from "@/features/studio/engine/messages";

export interface OpenedInput {
  deviceId: string | null;
  label: string | null;
  /** Capture delay the browser reports for this input, in ms. */
  latencyMs: number;
}

export class LocalInput {
  readonly tap: SignalTap;
  readonly fx: InputFx;
  private readonly capture: AudioWorkletNode;
  private readonly monitor: GainNode;
  private readonly monitorWet: GainNode;
  private monitoring = false;
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
    this.fx = new InputFx(context);
    this.fx.output.connect(this.capture);
    this.fx.output.connect(this.tap.input);
    this.monitor = this.monitorOf(this.fx.output);
    this.monitorWet = this.monitorOf(this.fx.wet);
    this.fx.subscribe(() => this.routeMonitor());
  }

  /** A path to the speakers that stays silent until Monitor opens it. */
  private monitorOf(source: AudioNode): GainNode {
    const gain = this.context.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(this.context.destination);
    return gain;
  }

  private configure(config: CaptureConfig, transfer: Transferable[] = []): void {
    this.capture.port.postMessage(config, transfer);
  }

  /** Opens the device and wires it in. Replaces any input already open. */
  async open(deviceId: string | null): Promise<OpenedInput> {
    const stream = await openInput(deviceId);
    this.close();
    this.stream = stream;
    this.latencyMs = inputLatencyMs(stream);
    this.source = this.context.createMediaStreamSource(stream);
    this.source.connect(this.fx.input);
    const track = stream.getAudioTracks()[0];
    return {
      deviceId: track?.getSettings().deviceId ?? deviceId,
      label: track?.label ?? null,
      latencyMs: this.latencyMs,
    };
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
    this.monitoring = on;
    this.routeMonitor();
  }

  /** Monitor plays either everything that is sent, or only the effects. */
  private routeMonitor(): void {
    const wetOnly = this.fx.get().monitorWetOnly;
    const now = this.context.currentTime;
    this.monitor.gain.setTargetAtTime(this.monitoring && !wetOnly ? 1 : 0, now, 0.01);
    this.monitorWet.gain.setTargetAtTime(this.monitoring && wetOnly ? 1 : 0, now, 0.01);
  }

  close(): void {
    this.configure({ sending: false });
    this.source?.disconnect();
    this.source = null;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
