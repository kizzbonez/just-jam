/**
 * Everything the worker does while connected to a room: owns the relay
 * session, the sender, one receiver per remote player and the stats loop.
 */
import { RELAY_CLOSE } from "@/features/rooms/constants";
import type {
  BufferSetting,
  CaptureFrame,
  LocalState,
  PeerInfo,
  PublishedState,
  TransportProfile,
  WorkerEvent,
} from "@/features/studio/engine/messages";
import { decodeAudio, TYPE_AUDIO } from "@/features/studio/engine/wire";
import { Pinger } from "@/features/studio/engine/worker/pinger";
import { Receiver } from "@/features/studio/engine/worker/receiver";
import { RelaySession, type RelayTarget } from "@/features/studio/engine/worker/relay-session";
import { Sender } from "@/features/studio/engine/worker/sender";

const STATS_INTERVAL_MS = 250;
const PUBLISH_INTERVAL_MS = 2000;

type Emit = (event: WorkerEvent) => void;

export class RoomLink {
  private session: RelaySession | null = null;
  private readonly sender: Sender;
  private readonly pinger = new Pinger();
  private readonly receivers = new Map<number, Receiver>();
  private capturePort: MessagePort | null = null;
  private profile: TransportProfile | null = null;
  private local: LocalState = { armed: false, muted: false, inputLatencyMs: 0 };
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private lastStatsAt = 0;
  private lastPublishAt = 0;
  private lastBytes = 0;
  /**
   * Set when the relay announces on the control stream why it is about to end
   * the session. That notice is reliable; the close code that follows is not
   * always delivered intact by the browser.
   */
  private announcedClose: number | null = null;

  constructor(private readonly emit: Emit) {
    this.sender = new Sender(
      (datagram) => this.session?.sendDatagram(datagram),
      (message) => emit({ t: "error", message }),
    );
  }

  async connect(target: RelayTarget): Promise<void> {
    this.session = await RelaySession.open(target, {
      onControl: (message) => this.onControl(message),
      onDatagram: (data, arrivalMs) => this.onDatagram(data, arrivalMs),
      onClosed: (code, reason) => this.onClosed(code, reason),
    });
    this.pinger.start((datagram) => this.session?.sendDatagram(datagram));
    this.lastStatsAt = performance.now();
    this.statsTimer = setInterval(() => this.reportStats(), STATS_INTERVAL_MS);
  }

  private onControl(message: Record<string, unknown>): void {
    switch (message.t) {
      case "welcome": {
        const maxDatagram = this.session?.maxDatagramSize ?? 0;
        const peers = message.peers as PeerInfo[];
        this.emit({ t: "live", slot: message.slot as number, peers, maxDatagram });
        this.publish();
        break;
      }
      case "peer-joined":
        this.emit({ t: "peer-joined", peer: message.peer as PeerInfo });
        break;
      case "peer-left":
        this.dropReceiver(message.slot as number);
        this.emit({ t: "peer-left", slot: message.slot as number, reason: String(message.reason) });
        break;
      case "peer-state":
        this.emit({
          t: "peer-state",
          slot: message.slot as number,
          state: message.state as PublishedState,
        });
        break;
      case "kicked":
        this.announcedClose = RELAY_CLOSE.KICKED;
        break;
      case "closed":
        this.announcedClose = RELAY_CLOSE.ROOM_GONE;
        break;
    }
  }

  private onDatagram(data: Uint8Array, arrivalMs: number): void {
    if (data[0] !== TYPE_AUDIO) {
      this.pinger.accept(data, arrivalMs);
      return;
    }
    const packet = decodeAudio(data);
    if (packet) this.receivers.get(packet.slot)?.push(packet, arrivalMs);
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
    this.dropReceiver(slot);
    this.receivers.set(slot, new Receiver(slot, port, this.bufferSetting()));
  }

  private dropReceiver(slot: number): void {
    this.receivers.get(slot)?.dispose();
    this.receivers.delete(slot);
  }

  private bufferSetting(): BufferSetting {
    return { mode: this.profile?.bufferMode ?? "AUTO", ms: this.profile?.bufferMs ?? 20 };
  }

  async setProfile(profile: TransportProfile): Promise<void> {
    const previous = this.profile;
    this.profile = profile;
    for (const receiver of this.receivers.values()) receiver.setBuffer(this.bufferSetting());
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
    const peers = [...this.receivers.values()].map((receiver) => receiver.tick(elapsed));
    const link = { rttMs: this.pinger.rttMs, sentKbps, sentPackets: this.sender.packets };
    this.emit({ t: "stats", link, peers });
    if (now - this.lastPublishAt > PUBLISH_INTERVAL_MS) this.publish();
  }

  private stop(): void {
    if (this.statsTimer !== null) clearInterval(this.statsTimer);
    this.statsTimer = null;
    this.pinger.stop();
    this.sender.dispose();
    for (const slot of [...this.receivers.keys()]) this.dropReceiver(slot);
    this.capturePort?.close();
  }

  close(): void {
    this.session?.close();
    this.stop();
  }
}
