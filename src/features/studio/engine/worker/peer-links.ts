/**
 * Player-to-player links. Each one is a WebRTC data channel that the page
 * negotiated and handed to this worker. The channel is unordered and never
 * retransmits, so it carries the same packets as the relay's datagrams,
 * without the detour through the relay.
 */
import { TYPE_AUDIO, TYPE_PING, TYPE_PONG } from "@/features/studio/engine/wire";
import { Pinger } from "@/features/studio/engine/worker/pinger";

/** A link whose last ping reply is older than this is not trusted with audio. */
const STALE_MS = 2000;
/** More than this many packets waiting means the path is choked: drop, never queue. */
const BACKLOG_PACKETS = 4;

export interface LinkHandlers {
  onAudio(slot: number, data: Uint8Array, arrivalMs: number): void;
  /** The set of links that can carry audio changed. */
  onChange(): void;
}

class PeerLink {
  private readonly pinger = new Pinger();
  /** True while the channel is open and the other side answers pings. */
  usable = false;

  constructor(
    readonly slot: number,
    private readonly channel: RTCDataChannel,
    private readonly handlers: LinkHandlers,
  ) {
    channel.binaryType = "arraybuffer";
    channel.onopen = () => this.startPinging();
    channel.onclose = () => this.refresh(performance.now());
    channel.onmessage = (event) => this.onMessage(new Uint8Array(event.data as ArrayBuffer));
    if (channel.readyState === "open") this.startPinging();
  }

  private startPinging(): void {
    this.pinger.start((ping) => this.write(ping));
  }

  /** Round trip to the other player, or null while the link is not usable. */
  get rttMs(): number | null {
    return this.usable ? this.pinger.rttMs : null;
  }

  private onMessage(data: Uint8Array): void {
    const now = performance.now();
    if (data[0] === TYPE_AUDIO) this.handlers.onAudio(this.slot, data, now);
    else if (data[0] === TYPE_PING) this.answer(data);
    else if (this.pinger.accept(data, now)) this.refresh(now);
  }

  private answer(ping: Uint8Array): void {
    ping[0] = TYPE_PONG;
    this.write(ping);
  }

  /** Re-evaluates the link and reports when its usability changed. */
  refresh(now: number): void {
    const repliedAt = this.pinger.lastReplyAt;
    const fresh = repliedAt !== null && now - repliedAt < STALE_MS;
    const usable = fresh && this.channel.readyState === "open";
    if (usable === this.usable) return;
    this.usable = usable;
    this.handlers.onChange();
  }

  send(data: Uint8Array): void {
    if (this.channel.bufferedAmount > BACKLOG_PACKETS * data.byteLength) return;
    this.write(data);
  }

  private write(data: Uint8Array): void {
    try {
      this.channel.send(data as Uint8Array<ArrayBuffer>);
    } catch {
      // The channel is closing. The next refresh takes the link out of use.
    }
  }

  dispose(): void {
    this.pinger.stop();
    this.channel.onopen = this.channel.onclose = this.channel.onmessage = null;
    this.channel.close();
  }
}

export class PeerLinks {
  private readonly links = new Map<number, PeerLink>();
  /** Rebuilt whenever a link changes, so the per-packet path only walks an array. */
  private usable: PeerLink[] = [];

  constructor(private readonly handlers: LinkHandlers) {}

  add(slot: number, channel: RTCDataChannel): void {
    this.remove(slot);
    const handlers: LinkHandlers = {
      onAudio: (from, data, arrivalMs) => this.handlers.onAudio(from, data, arrivalMs),
      onChange: () => this.rebuild(),
    };
    this.links.set(slot, new PeerLink(slot, channel, handlers));
  }

  remove(slot: number): void {
    const link = this.links.get(slot);
    if (!link) return;
    link.dispose();
    this.links.delete(slot);
    if (link.usable) this.rebuild();
  }

  /** Re-checks every link, so one that has gone quiet is noticed. */
  sweep(now: number): void {
    for (const link of this.links.values()) link.refresh(now);
  }

  /** Sends one packet on every usable link. */
  broadcast(data: Uint8Array): void {
    for (const link of this.usable) link.send(data);
  }

  has(slot: number): boolean {
    return this.links.get(slot)?.usable ?? false;
  }

  rttOf(slot: number): number | null {
    return this.links.get(slot)?.rttMs ?? null;
  }

  /** Slots of the players reached directly right now. */
  get slots(): number[] {
    return this.usable.map((link) => link.slot);
  }

  private rebuild(): void {
    this.usable = [...this.links.values()].filter((link) => link.usable);
    this.handlers.onChange();
  }

  dispose(): void {
    for (const slot of [...this.links.keys()]) this.remove(slot);
  }
}
