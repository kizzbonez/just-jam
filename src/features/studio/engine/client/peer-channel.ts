/**
 * One remote player's strip in the audio graph:
 *
 *   playback worklet (jitter buffer) -> gain -> pan -+-> speakers
 *                                                    +-> tap (meters)
 *
 * Volume, pan and mute are ordinary Web Audio nodes, so they change smoothly
 * and cost nothing on the network.
 */
import type { PeerMix } from "@/features/studio/engine/client/room-store";
import { SignalTap } from "@/features/studio/engine/client/signal-tap";

const RAMP_SECONDS = 0.012;

export class PeerChannel {
  readonly tap: SignalTap;
  private readonly playback: AudioWorkletNode;
  private readonly gain: GainNode;
  private readonly panner: StereoPannerNode;

  /** `workerPort` is handed to the worklet; its twin goes to the transport worker. */
  constructor(
    private readonly context: AudioContext,
    workerPort: MessagePort,
  ) {
    this.playback = new AudioWorkletNode(context, "tonelink-playback", {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });
    this.playback.port.postMessage({ port: workerPort }, [workerPort]);
    this.gain = context.createGain();
    this.panner = context.createStereoPanner();
    this.tap = new SignalTap(context);
    this.playback.connect(this.gain).connect(this.panner);
    this.panner.connect(context.destination);
    this.panner.connect(this.tap.input);
  }

  applyMix(mix: PeerMix): void {
    const now = this.context.currentTime;
    this.gain.gain.setTargetAtTime(mix.muted ? 0 : mix.gain, now, RAMP_SECONDS);
    this.panner.pan.setTargetAtTime(mix.pan, now, RAMP_SECONDS);
  }

  dispose(): void {
    this.playback.disconnect();
    this.gain.disconnect();
    this.panner.disconnect();
    this.tap.dispose();
    this.playback.port.close();
  }
}
