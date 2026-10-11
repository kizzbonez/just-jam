/**
 * Everything the worker does while connected to a room: owns the relay
 * session, the sender, the audio paths to the other players and the stats loop.
 */
import { RELAY_CLOSE } from "@/features/rooms/constants";
import type {
  BufferSetting,
  CaptureFrame,
  LocalState,
  P2pSignal,
  PeerInfo,
  PublishedState,
  TransportProfile,
  WorkerEvent,
} from "@/features/studio/engine/messages";
import { parseSignal } from "@/features/studio/engine/p2p-signal";
import { TYPE_AUDIO } from "@/features/studio/engine/wire";
import { Pacer } from "@/features/studio/engine/worker/pacer";
import { PeerAudio } from "@/features/studio/engine/worker/peer-audio";
import { Pinger } from "@/features/studio/engine/worker/pinger";
import {
  openRelay,
  type RelayLink,
  type RelayTarget,
} from "@/features/studio/engine/worker/relay-link";
import { Sender } from "@/features/studio/engine/worker/sender";

const STATS_INTERVAL_MS = 250;
const PUBLISH_INTERVAL_MS = 2000;

type Emit = (event: WorkerEvent) => void;

export class RoomLink {
  private session: RelayLink | null = null;
  private readonly sender: Sender;
  private readonly pinger = new Pinger();
  private readonly audio: PeerAudio;
  private readonly signals = new Pacer<object>((message) => this.session?.sendControl(message));
  private capturePort: MessagePort | null = null;
  private profile: TransportProfile | null = null;
  private local: LocalState = { armed: false, muted: false, inputLatencyMs: 0 };
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private lastStatsAt = 0;
  private lastPublishAt = 0;
  private lastBytes = 0;
  private relayed = 0;
  /**
   * Set when the relay announces on the control stream why it is about to end
   * the session. That notice is reliable; the close code that follows is not
   * always delivered intact by the browser.
   */
  private announcedClose: number | null = null;

  constructor(private readonly emit: Emit) {
    this.audio = new PeerAudio((slots) => this.session?.sendControl({ t: "p2p", slots }));
    this.sender = new Sender(
      (datagram) => this.sendAudio(datagram),
      (message) => emit({ t: "error", message }),
    );
  }

  /** Linked players get the packet directly; the relay carries it to the rest. */
  private sendAudio(datagram: Uint8Array): void {
    if (!this.audio.send(datagram)) return;
    this.session?.sendDatagram(datagram);
    this.relayed++;
  }

  async connect(target: RelayTarget): Promise<void> {
    this.session = await openRelay(target, {
      onControl: (message) => this.onControl(message),
      onDatagram: (data, arrivalMs) => this.onDatagram(data, arrivalMs),
      onClosed: (code, reason) => this.onClosed(code, reason),
    });
    this.pinger.start((datagram) => this.session?.sendDatagram(datagram));
    this.lastStatsAt = performance.now();
    this.statsTimer = setInterval(() => this.reportStats(), STATS_INTERVAL_MS);
  }

  /** The relay has seated us: tell the page, then announce our own state. */
  private onWelcome(message: Record<string, unknown>): void {
    const session = this.session;
    if (!session) return;
    this.emit({
      t: "live",
      slot: message.slot as number,
      peers: message.peers as PeerInfo[],
      maxDatagram: session.maxDatagramSize,
      transport: session.kind,
    });
    this.publish();
  }

  private onControl(message: Record<string, unknown>): void {
    switch (message.t) {
      case "welcome":
        this.onWelcome(message);
        break;
      case "peer-joined":
        this.emit({ t: "peer-joined", peer: message.peer as PeerInfo });
        break;
      case "peer-left":
        this.audio.dropPeer(message.slot as number);
        this.emit({ t: "peer-left", slot: message.slot as number, reason: String(message.reason) });
        break;
      case "peer-state":
        this.emit({
          t: "peer-state",
          slot: message.slot as number,
          state: message.state as PublishedState,
        });
        break;
      case "signal":
        this.onSignal(message);
        break;
      case "kicked":
        this.announcedClose = RELAY_CLOSE.KICKED;
        break;
      case "closed":
        this.announcedClose = RELAY_CLOSE.ROOM_GONE;
        break;
    }
  }

  /** Another player's link negotiation, which only the page can act on. */
  private onSignal(message: Record<string, unknown>): void {
    const signal = parseSignal(message.data);
    if (signal) this.emit({ t: "signal", slot: message.slot as number, signal });
  }

  private onDatagram(data: Uint8Array, arrivalMs: number): void {
    if (data[0] === TYPE_AUDIO) this.audio.fromRelay(data, arrivalMs);
    else this.pinger.accept(data, arrivalMs);
  }

  private onClosed(code: number | null, reason: string): void {
    this.stop();
    this.emit({ t: "closed", code: this.announcedClose ?? code, reason });
  }

  setCapturePort(port: MessagePort): void {
    this.capturePort = port;
    port.onmessage = (event) => {
      const frame = event.data as CaptureFrame;
      this.sender.push(frame);
      // Return the buffer so the worklet does not allocate per frame.
      port.postMessage(frame.planar.buffer, [frame.planar.buffer]);
    };
  }

  addPeer(slot: number, port: MessagePort): void {
    this.audio.addPeer(slot, port);
  }

  addLink(slot: number, channel: RTCDataChannel): void {
    this.audio.addLink(slot, channel);
  }

  removeLink(slot: number): void {
    this.audio.removeLink(slot);
  }

  /** Passes our side of a link negotiation to one player, through the relay. */
  signal(slot: number, signal: P2pSignal): void {
    this.signals.push({ t: "signal", slot, data: signal });
  }

  private bufferSetting(): BufferSetting {
    return { mode: this.profile?.bufferMode ?? "AUTO", ms: this.profile?.bufferMs ?? 20 };
  }

  async setProfile(profile: TransportProfile): Promise<void> {
    const previous = this.profile;
    this.profile = profile;
    this.audio.setBuffer(this.bufferSetting());
    const sameCodec =
      previous?.codec === profile.codec &&
      previous.frameMicros === profile.frameMicros &&
      previous.bitrateKbps === profile.bitrateKbps;
    if (sameCodec) return;
    await this.sender.configure(profile);
    this.publish();
  }

  setLocal(state: LocalState): void {
    this.local = state;
    this.publish();
  }

  kick(slot: number): void {
    this.session?.sendControl({ t: "kick", slot });
  }

  private publish(): void {
    if (!this.session || !this.profile) return;
    const state: PublishedState = {
      ...this.local,
      codec: this.profile.codec,
      frameMicros: this.profile.frameMicros,
      rttMs: Math.round((this.pinger.rttMs ?? 0) * 10) / 10,
    };
    this.session.sendControl({ t: "state", state });
    this.lastPublishAt = performance.now();
  }

  private reportStats(): void {
    const now = performance.now();
    const elapsed = (now - this.lastStatsAt) / 1000;
    this.lastStatsAt = now;
    const sentKbps = ((this.sender.bytes - this.lastBytes) * 8) / 1000 / Math.max(elapsed, 0.001);
    this.lastBytes = this.sender.bytes;
    const peers = this.audio.stats(elapsed, now);
    const { packets } = this.sender;
    const link = { rttMs: this.pinger.rttMs, sentKbps, sentPackets: packets, relayedPackets: this.relayed };
    this.emit({ t: "stats", link, peers });
    if (now - this.lastPublishAt > PUBLISH_INTERVAL_MS) this.publish();
  }

  private stop(): void {
    if (this.statsTimer !== null) clearInterval(this.statsTimer);
    this.statsTimer = null;
    this.pinger.stop();
    this.signals.clear();
    this.sender.dispose();
    this.audio.dispose();
    this.capturePort?.close();
  }

  close(): void {
    this.session?.close();
    this.stop();
  }
}
