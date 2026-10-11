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
import { OutputDevice } from "@/features/studio/engine/client/output-device";
import { PeerRack } from "@/features/studio/engine/client/peer-rack";
import { RoomStore, type PeerMix } from "@/features/studio/engine/client/room-store";
import type { SignalTap } from "@/features/studio/engine/client/signal-tap";
import { TelemetryHistory } from "@/features/studio/engine/client/telemetry-history";
import type { PeerInfo, WorkerCommand, WorkerEvent } from "@/features/studio/engine/messages";

const ENGINE_PATH = "/engine";
/** Changes with every engine build, so a cached copy from an older build is never reused. */
const ENGINE_VERSION = process.env.NEXT_PUBLIC_ENGINE_VERSION ?? "dev";
const engineUrl = (file: string) => `${ENGINE_PATH}/${file}?v=${ENGINE_VERSION}`;

interface EngineParts {
  context: AudioContext;
  worker: Worker;
  input: LocalInput;
}

export class StudioEngine {
  readonly store: RoomStore;
  /** A minute of buffer telemetry per player, for the trace scope. */
  readonly history = new TelemetryHistory();
  private readonly rack: PeerRack;
  private readonly output: OutputDevice;
  /** For linking to the other players' browsers. Null keeps audio on the relay. */
  private iceServers: RTCIceServer[] | null = null;
  private disposed = false;
  /** Relay close code of the ended session, for deciding whether to offer a rejoin. */
  closeCode: number | null = null;

  private readonly context: AudioContext;
  private readonly worker: Worker;
  private readonly input: LocalInput;

  private constructor(parts: EngineParts, profile: AudioProfile) {
    const worker = (this.worker = parts.worker);
    this.context = parts.context;
    this.input = parts.input;
    this.store = new RoomStore(profile);
    this.rack = new PeerRack(parts.context, (item, transfer) => this.command(item, transfer));
    this.output = new OutputDevice(parts.context, (blockMs) => this.command({ t: "output", blockMs }));
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => this.onEvent(event.data);
    // The worker script failed to load or crashed: the session cannot continue.
    worker.onerror = () =>
      this.store.set({
        phase: "closed",
        closeReason: "The audio engine could not start. Reload the page to try again.",
      });
    this.applyFormat(profile);
  }

  static async create(profile: AudioProfile): Promise<StudioEngine> {
    const context = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: 0 });
    await Promise.all([
      context.audioWorklet.addModule(engineUrl("capture.worklet.js")),
      context.audioWorklet.addModule(engineUrl("playback.worklet.js")),
    ]);
    await context.resume();
    const worker = new Worker(engineUrl("transport.worker.js"), { type: "module" });
    const capture = new MessageChannel();
    worker.postMessage({ t: "capture-port", port: capture.port2 } satisfies WorkerCommand, [
      capture.port2,
    ]);
    const input = new LocalInput(context, capture.port1);
    const engine = new StudioEngine({ context, worker, input }, profile);
    engine.output.report();
    if (profile.outputDeviceId) void engine.setOutputDevice(profile.outputDeviceId);
    return engine;
  }

  private command(command: WorkerCommand, transfer: Transferable[] = []): void {
    this.worker.postMessage(command, transfer);
  }

  /**
   * `direct` is false when the relay's QUIC address cannot work from this
   * device. `p2p` is false when this browser should not link to the others.
   */
  connect(ticket: RoomTicket, route: { direct: boolean; p2p: boolean }): void {
    this.iceServers = route.p2p ? (ticket.p2p?.iceServers ?? null) : null;
    this.command({ t: "profile", profile: this.store.getState().profile });
    this.command({
      t: "connect",
      url: route.direct ? ticket.relayUrl : null,
      certHash: ticket.certHash,
      wsUrl: ticket.relayWsUrl,
      ticket: ticket.ticket,
    });
  }

  private onEvent(event: WorkerEvent): void {
    switch (event.t) {
      case "live":
        this.store.set({
          phase: "live",
          selfSlot: event.slot,
          maxDatagram: event.maxDatagram,
          transport: event.transport,
        });
        this.rack.startLinks(event.slot, this.iceServers);
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
      case "signal":
        this.rack.signal(event.slot, event.signal);
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
    this.rack.add(info.slot);
    this.store.upsertPeer(info);
  }

  private removePeer(slot: number): void {
    this.rack.remove(slot);
    this.history.drop(slot);
    this.store.removePeer(slot);
  }

  /** The local input's measuring point and its effects. */
  get local(): Pick<LocalInput, "tap" | "fx"> {
    return this.input;
  }

  /** Measuring point after a player's fader and pan. */
  peerTap(slot: number): SignalTap | null {
    return this.rack.get(slot)?.tap ?? null;
  }

  /** Output delay the browser reports for this device, in ms. */
  get outputLatencyMs(): number {
    return this.output.latencyMs;
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
    this.rack.get(slot)?.applyMix(mix);
    this.store.patchPeer(slot, { mix });
  }

  kick(slot: number): void {
    this.command({ t: "kick", slot });
  }

  /** Routes playback to a device, or back to the system default with null. */
  async setOutputDevice(deviceId: string | null): Promise<void> {
    try {
      await this.output.use(deviceId);
      this.store.set({ profile: { ...this.store.getState().profile, outputDeviceId: deviceId } });
    } catch {
      this.store.set({ engineError: "That playback device could not be used." });
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.rack.dispose();
    this.command({ t: "close" });
    this.input.close();
    // Give the worker a moment to close the session cleanly before it is stopped.
    setTimeout(() => this.worker.terminate(), 250);
    void this.context.close();
  }
}
