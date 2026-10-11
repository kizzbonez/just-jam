/**
 * The page-side view of a live room, held outside React. Components subscribe
 * with useSyncExternalStore; the engine is the only writer.
 */
import type { AudioProfile } from "@/features/studio/audio-profile";
import type {
  LinkStats,
  PeerInfo,
  PeerStats,
  PublishedState,
  TransportKind,
} from "@/features/studio/engine/messages";

export type RoomPhase = "connecting" | "live" | "closed";

export interface PeerMix {
  /** Linear gain, 0 to 1.5. */
  gain: number;
  /** -1 (left) to 1 (right). */
  pan: number;
  muted: boolean;
}

export interface PeerView extends PeerInfo {
  mix: PeerMix;
  stats: PeerStats | null;
}

export interface InputView {
  armed: boolean;
  muted: boolean;
  monitor: boolean;
  deviceId: string | null;
  label: string | null;
  /** Capture delay the browser reports for the open input, in ms. */
  latencyMs: number;
  error: string | null;
  busy: boolean;
}

export interface RoomState {
  phase: RoomPhase;
  /** Why the session ended, in words for the player. */
  closeReason: string | null;
  selfSlot: number | null;
  peers: PeerView[];
  input: InputView;
  link: LinkStats;
  profile: AudioProfile;
  maxDatagram: number;
  /** Null until connected. */
  transport: TransportKind | null;
  engineError: string | null;
}

export const DEFAULT_MIX: PeerMix = { gain: 1, pan: 0, muted: false };

type Listener = () => void;

export class RoomStore {
  private state: RoomState;
  private readonly listeners = new Set<Listener>();

  constructor(profile: AudioProfile) {
    this.state = {
      phase: "connecting",
      closeReason: null,
      selfSlot: null,
      peers: [],
      input: {
        armed: false,
        muted: false,
        monitor: false,
        deviceId: profile.inputDeviceId,
        label: profile.inputLabel,
        latencyMs: 0,
        error: null,
        busy: false,
      },
      link: { rttMs: null, sentKbps: 0, sentPackets: 0, relayedPackets: 0 },
      profile,
      maxDatagram: 0,
      transport: null,
      engineError: null,
    };
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = (): RoomState => this.state;

  set(patch: Partial<RoomState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  setInput(patch: Partial<InputView>): void {
    this.set({ input: { ...this.state.input, ...patch } });
  }

  upsertPeer(info: PeerInfo): void {
    const others = this.state.peers.filter((peer) => peer.slot !== info.slot);
    const previous = this.state.peers.find((peer) => peer.slot === info.slot);
    const peer: PeerView = { ...info, mix: previous?.mix ?? DEFAULT_MIX, stats: null };
    this.set({ peers: [...others, peer].sort((a, b) => a.slot - b.slot) });
  }

  removePeer(slot: number): void {
    this.set({ peers: this.state.peers.filter((peer) => peer.slot !== slot) });
  }

  patchPeer(slot: number, patch: Partial<PeerView>): void {
    this.set({
      peers: this.state.peers.map((peer) => (peer.slot === slot ? { ...peer, ...patch } : peer)),
    });
  }

  setPeerState(slot: number, state: PublishedState): void {
    this.patchPeer(slot, { state });
  }

  applyStats(link: LinkStats, stats: PeerStats[]): void {
    const bySlot = new Map(stats.map((item) => [item.slot, item]));
    const peers = this.state.peers.map((peer) => ({
      ...peer,
      stats: bySlot.get(peer.slot) ?? peer.stats,
    }));
    this.set({ link, peers });
  }
}
