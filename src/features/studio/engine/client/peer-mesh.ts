/**
 * The page's side of player-to-player audio: one WebRTC connection per remote
 * player, negotiated through the relay, with each data channel handed to the
 * transport worker the moment it exists.
 */
import type { P2pSignal, WorkerCommand } from "@/features/studio/engine/messages";
import { PeerNegotiator } from "@/features/studio/engine/client/peer-negotiator";

export interface MeshOptions {
  selfSlot: number;
  iceServers: RTCIceServer[];
  /** Posts a command to the transport worker. */
  command(command: WorkerCommand, transfer?: Transferable[]): void;
}

export class PeerMesh {
  private readonly peers = new Map<number, PeerNegotiator>();
  /** Set when this browser cannot move a data channel to a worker. Audio then stays on the relay. */
  private unsupported = false;

  constructor(private readonly options: MeshOptions) {}

  /** Starts linking to a player who is in the room. */
  add(slot: number): void {
    this.remove(slot);
    if (this.unsupported) return;
    const { selfSlot, iceServers, command } = this.options;
    const peer = new PeerNegotiator({
      initiator: selfSlot < slot,
      iceServers,
      send: (signal) => command({ t: "signal", slot, signal }),
    });
    try {
      command({ t: "p2p-channel", slot, channel: peer.channel }, [peer.channel]);
      this.peers.set(slot, peer);
    } catch {
      this.unsupported = true;
      peer.close();
    }
  }

  accept(slot: number, signal: P2pSignal): void {
    void this.peers.get(slot)?.accept(signal);
  }

  remove(slot: number): void {
    const peer = this.peers.get(slot);
    if (!peer) return;
    peer.close();
    this.peers.delete(slot);
    this.options.command({ t: "p2p-close", slot });
  }

  dispose(): void {
    for (const slot of [...this.peers.keys()]) this.remove(slot);
  }
}
