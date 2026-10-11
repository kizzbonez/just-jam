/**
 * Audio to and from the other players in the room: one receiver per player,
 * the links between browsers, and the choice of path for every packet.
 */
import type {
  BufferSetting,
  PeerRoute,
  PeerStats,
} from "@/features/studio/engine/messages";
import { RouteGate } from "@/features/studio/engine/route-gate";
import { type AudioPacket, decodeAudio } from "@/features/studio/engine/wire";
import { PeerLinks } from "@/features/studio/engine/worker/peer-links";
import { Receiver } from "@/features/studio/engine/worker/receiver";

export class PeerAudio {
  private readonly receivers = new Map<number, Receiver>();
  private readonly gate = new RouteGate();
  private readonly links: PeerLinks;
  private buffer: BufferSetting = { mode: "AUTO", ms: 20 };
  /** Block size of this machine's output device, in ms. Unknown until the page reports it. */
  private blockMs: number | undefined;
  /** True while at least one player can only be reached through the relay. */
  private relayNeeded = false;

  /** `onLinked` is told which slots are reached directly, so the relay can skip them. */
  constructor(private readonly onLinked: (slots: number[]) => void) {
    this.links = new PeerLinks({
      onAudio: (slot, data, arrivalMs) => this.fromLink(slot, data, arrivalMs),
      onChange: () => this.onLinksChanged(),
    });
  }

  addPeer(slot: number, port: MessagePort): void {
    this.dropReceiver(slot);
    const receiver = new Receiver(slot, port, this.buffer);
    receiver.setOutputBlock(this.blockMs);
    this.receivers.set(slot, receiver);
    this.planRoutes();
  }

  /** The player left the room: forget everything about them. */
  dropPeer(slot: number): void {
    this.dropReceiver(slot);
    this.links.remove(slot);
    this.planRoutes();
  }

  private dropReceiver(slot: number): void {
    this.receivers.get(slot)?.dispose();
    this.receivers.delete(slot);
    this.gate.forget(slot);
  }

  addLink(slot: number, channel: RTCDataChannel): void {
    this.links.add(slot, channel);
  }

  removeLink(slot: number): void {
    this.links.remove(slot);
  }

  setOutputBlock(blockMs: number): void {
    this.blockMs = blockMs;
    for (const receiver of this.receivers.values()) receiver.setOutputBlock(blockMs);
  }

  setBuffer(buffer: BufferSetting): void {
    this.buffer = buffer;
    for (const receiver of this.receivers.values()) receiver.setBuffer(buffer);
  }

  /** Sends our audio on every link. True when the relay has to carry it as well. */
  send(datagram: Uint8Array): boolean {
    this.links.broadcast(datagram);
    return this.relayNeeded;
  }

  fromRelay(data: Uint8Array, arrivalMs: number): void {
    const packet = decodeAudio(data);
    if (packet) this.deliver(packet, arrivalMs, "relay");
  }

  private fromLink(slot: number, data: Uint8Array, arrivalMs: number): void {
    const packet = decodeAudio(data);
    if (!packet) return;
    // The link says who is speaking. The slot byte inside the packet is not trusted.
    packet.slot = slot;
    this.deliver(packet, arrivalMs, "p2p");
  }

  private deliver(packet: AudioPacket, arrivalMs: number, path: PeerRoute): void {
    const receiver = this.receivers.get(packet.slot);
    if (!receiver) return;
    const verdict = this.gate.admit(packet.slot, path, arrivalMs);
    if (verdict === "drop") return;
    if (verdict === "switch") receiver.rebase();
    receiver.push(packet, arrivalMs);
  }

  private onLinksChanged(): void {
    this.planRoutes();
    this.onLinked(this.links.slots);
  }

  private planRoutes(): void {
    this.relayNeeded = [...this.receivers.keys()].some((slot) => !this.links.has(slot));
  }

  /** Runs each player's buffer tuner and collects the telemetry. */
  stats(elapsedSeconds: number, now: number): PeerStats[] {
    this.links.sweep(now);
    return [...this.receivers.values()].map((receiver) => ({
      ...receiver.tick(elapsedSeconds),
      route: this.links.has(receiver.slot) ? "p2p" : "relay",
      p2pRttMs: this.links.rttOf(receiver.slot),
    }));
  }

  dispose(): void {
    this.links.dispose();
    for (const slot of [...this.receivers.keys()]) this.dropReceiver(slot);
  }
}
