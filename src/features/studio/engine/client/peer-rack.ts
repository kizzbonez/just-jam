/**
 * What the page keeps for each remote player: their strip in the audio graph
 * and, where the studio allows it, the link to their browser.
 */
import { PeerChannel } from "@/features/studio/engine/client/peer-channel";
import { PeerMesh } from "@/features/studio/engine/client/peer-mesh";
import type { P2pSignal, WorkerCommand } from "@/features/studio/engine/messages";

type Command = (command: WorkerCommand, transfer?: Transferable[]) => void;

export class PeerRack {
  private readonly channels = new Map<number, PeerChannel>();
  /** Null while audio stays on the relay. */
  private mesh: PeerMesh | null = null;

  constructor(
    private readonly context: AudioContext,
    private readonly command: Command,
  ) {}

  /** Call once seated in the room. Without ICE servers there are no links. */
  startLinks(selfSlot: number, iceServers: RTCIceServer[] | null): void {
    if (iceServers) this.mesh = new PeerMesh({ selfSlot, iceServers, command: this.command });
  }

  add(slot: number): void {
    this.remove(slot);
    const ports = new MessageChannel();
    this.channels.set(slot, new PeerChannel(this.context, ports.port1));
    this.command({ t: "peer-port", slot, port: ports.port2 }, [ports.port2]);
    this.mesh?.add(slot);
  }

  remove(slot: number): void {
    this.channels.get(slot)?.dispose();
    this.channels.delete(slot);
    this.mesh?.remove(slot);
  }

  get(slot: number): PeerChannel | undefined {
    return this.channels.get(slot);
  }

  /** A link negotiation message from that player. */
  signal(slot: number, signal: P2pSignal): void {
    this.mesh?.accept(slot, signal);
  }

  dispose(): void {
    for (const slot of [...this.channels.keys()]) this.remove(slot);
  }
}
