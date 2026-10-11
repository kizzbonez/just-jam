/**
 * StudioEngine: the page-side owner of a live room. It builds the Web Audio
 * graph, starts the transport worker, connects the two with message ports and
 * mirrors what happens into a RoomStore for the UI.
 */
import type { RoomTicket } from "@/features/rooms/server/issue-ticket";
import { SAMPLE_RATE, type AudioProfile } from "@/features/studio/audio-profile";
import { describeInputError } from "@/features/studio/engine/client/capture";
import { describeClose } from "@/features/studio/engine/client/close-reasons";
import { LocalInput } from "@/features/studio/engine/client/local-input";
import { PeerChannel } from "@/features/studio/engine/client/peer-channel";
import { RoomStore, type PeerMix } from "@/features/studio/engine/client/room-store";
import type { SignalTap } from "@/features/studio/engine/client/signal-tap";
import { TelemetryHistory } from "@/features/studio/engine/client/telemetry-history";
import type { PeerInfo, WorkerCommand, WorkerEvent } from "@/features/studio/engine/messages";

const ENGINE_PATH = "/engine";

interface EngineParts {
  context: AudioContext;
  worker: Worker;
  input: LocalInput;
}

export class StudioEngine {
  readonly store: RoomStore;
  /** A minute of buffer telemetry per player, for the trace scope. */
  readonly history = new TelemetryHistory();
  private readonly channels = new Map<number, PeerChannel>();
  private disposed = false;
  /** Relay close code of the ended session, for deciding whether to offer a rejoin. */
  closeCode: number | null = null;

  private readonly context: AudioContext;
  private readonly worker: Worker;
  private readonly input: LocalInput;

  private constructor(parts: EngineParts, profile: AudioProfile) {
    const { worker } = parts;
    this.context = parts.context;
    this.worker = worker;
    this.input = parts.input;
    this.store = new RoomStore(profile);
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => this.onEvent(event.data);
    worker.onerror = () => this.store.set({ engineError: "The audio engine stopped unexpectedly." });
    this.applyFormat(profile);
  }

  static async create(profile: AudioProfile): Promise<StudioEngine> {
    const context = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 0 });
    await Promise.all([
      context.audioWorklet.addModule(`${ENGINE_PATH}/capture.worklet.js`),
      context.audioWorklet.addModule(`${ENGINE_PATH}/playback.worklet.js`),
    ]);
    await context.resume();
    const worker = new Worker(`${ENGINE_PATH}/transport.worker.js`, { type: "module" });
    const capture = new MessageChannel();
    worker.postMessage({ t: "capture-port", port: capture.port2 } satisfies WorkerCommand, [
      capture.port2,
    ]);
    const input = new LocalInput(context, capture.port1);
    return new StudioEngine({ context, worker, input }, profile);
  }

  private command(command: WorkerCommand, transfer: Transferable[] = []): void {
    this.worker.postMessage(command, transfer);
  }

  connect(ticket: RoomTicket): void {
    this.command({ t: "profile", profile: this.store.getState().profile });
    this.command({ t: "connect", url: ticket.relayUrl, certHash: ticket.certHash, ticket: ticket.ticket });
  }

  private onEvent(event: WorkerEvent): void {
    switch (event.t) {
      case "live":
        this.store.set({ phase: "live", selfSlot: event.slot, maxDatagram: event.maxDatagram });
        event.peers.forEach((peer) => this.addPeer(peer));
        this.publishLocal();
        break;
      case "peer-joined":
        this.addPeer(event.peer);
        break;
      case "peer-left":
        this.removePeer(event.slot);
        break;
      case "peer-state":
        this.store.setPeerState(event.slot, event.state);
        break;
      case "stats":
        this.history.push(event.peers);
        this.store.applyStats(event.link, event.peers);
        break;
      case "closed":
        this.closeCode = event.code;
        this.store.set({ phase: "closed", closeReason: describeClose(event.code, event.reason) });
        break;
      case "error":
        this.store.set({ engineError: event.message });
        break;
    }
  }

  private addPeer(info: PeerInfo): void {
    this.removePeer(info.slot);
    const link = new MessageChannel();
    this.channels.set(info.slot, new PeerChannel(this.context, link.port1));
    this.command({ t: "peer-port", slot: info.slot, port: link.port2 }, [link.port2]);
    this.store.upsertPeer(info);
  }

  private removePeer(slot: number): void {
    this.channels.get(slot)?.dispose();
    this.channels.delete(slot);
    this.history.drop(slot);
    this.store.removePeer(slot);
  }

  /** Measuring point on the raw interface input. */
  get inputTap(): SignalTap {
    return this.input.tap;
  }

  /** Measuring point after a player's fader and pan. */
  peerTap(slot: number): SignalTap | null {
    return this.channels.get(slot)?.tap ?? null;
  }

  /** Output delay the browser reports for this device, in ms. */
  get outputLatencyMs(): number {
    return (this.context.baseLatency + (this.context.outputLatency || 0)) * 1000;
  }

  private publishLocal(): void {
    const { armed, muted } = this.store.getState().input;
    this.input.setSending(armed && !muted);
    this.command({ t: "local", state: { armed, muted, inputLatencyMs: this.input.latencyMs } });
  }

  /** Opens the chosen interface and starts sending. */
  async arm(deviceId: string | null): Promise<void> {
    this.store.setInput({ busy: true, error: null });
    try {
      const opened = await this.input.open(deviceId);
      this.input.onEnded(() => this.disarm("The audio input was disconnected."));
      this.store.setInput({ ...opened, armed: true, busy: false });
    } catch (error) {
      this.store.setInput({ armed: false, busy: false, error: describeInputError(error) });
    }
    this.publishLocal();
  }

  disarm(error: string | null = null): void {
    this.input.close();
    this.store.setInput({ armed: false, error });
    this.publishLocal();
  }

  setMuted(muted: boolean): void {
    this.store.setInput({ muted });
    this.publishLocal();
  }

  setMonitor(monitor: boolean): void {
    this.input.setMonitor(monitor);
    this.store.setInput({ monitor });
  }

  private applyFormat(profile: AudioProfile): void {
    this.input.setFormat(profile.frameMicros, profile.channelMode);
  }

  /** Applies new transport or buffer settings to the running session. */
  setProfile(patch: Partial<AudioProfile>): void {
    const profile = { ...this.store.getState().profile, ...patch };
    this.store.set({ profile });
    this.applyFormat(profile);
    this.command({ t: "profile", profile });
  }

  setPeerMix(slot: number, patch: Partial<PeerMix>): void {
    const peer = this.store.getState().peers.find((item) => item.slot === slot);
    if (!peer) return;
    const mix = { ...peer.mix, ...patch };
    this.channels.get(slot)?.applyMix(mix);
    this.store.patchPeer(slot, { mix });
  }

  kick(slot: number): void {
    this.command({ t: "kick", slot });
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    const context = this.context as AudioContext & { setSinkId?: (id: string) => Promise<void> };
    await context.setSinkId?.(deviceId);
    this.store.set({ profile: { ...this.store.getState().profile, outputDeviceId: deviceId } });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.command({ t: "close" });
    this.input.close();
    for (const slot of [...this.channels.keys()]) this.removePeer(slot);
    // Give the worker a moment to close the session cleanly before it is stopped.
    setTimeout(() => this.worker.terminate(), 250);
    void this.context.close();
  }
}
