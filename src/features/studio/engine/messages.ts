/**
 * Message contracts between the three threads the engine runs on:
 * the page (UI + Web Audio graph), the transport worker (WebTransport +
 * WebCodecs) and the AudioWorklets (capture and playback).
 */
import type {
  AudioProfile,
  BufferModeValue,
  ChannelModeValue,
  CodecValue,
  FrameMicros,
} from "@/features/studio/audio-profile";

/** How the session reaches the relay: direct QUIC datagrams, or the WebSocket fallback. */
export type TransportKind = "quic" | "websocket";

/** How one player's audio travels: between the two browsers, or through the relay. */
export type PeerRoute = "p2p" | "relay";

/** WebRTC negotiation between two players, carried by the relay's control stream. */
export type P2pSignal =
  | { k: "offer" | "answer"; sdp: string }
  | { k: "ice"; list: RTCIceCandidateInit[] };

/** A participant as the relay announces them (relay/peer.go PeerInfo). */
export interface PeerInfo {
  slot: number;
  userId: string;
  name: string;
  inst: string;
  host: boolean;
  /** Avatar version, 0 when the player has no picture. */
  ava: number;
  state?: PublishedState;
}

/** What each player broadcasts about themselves over the control stream. */
export interface PublishedState {
  armed: boolean;
  muted: boolean;
  codec: CodecValue;
  frameMicros: FrameMicros;
  /** Round trip to the relay, in ms. */
  rttMs: number;
  /** Capture latency the browser reports for the input device, in ms. */
  inputLatencyMs: number;
}

export type TransportProfile = Pick<
  AudioProfile,
  "codec" | "frameMicros" | "bitrateKbps" | "bufferMode" | "bufferMs"
>;

export interface BufferSetting {
  mode: BufferModeValue;
  ms: number;
}

export interface LocalState {
  armed: boolean;
  muted: boolean;
  inputLatencyMs: number;
}

export type WorkerCommand =
  | { t: "connect"; url: string | null; certHash: string | null; wsUrl: string | null; ticket: string }
  | { t: "capture-port"; port: MessagePort }
  | { t: "peer-port"; slot: number; port: MessagePort }
  | { t: "profile"; profile: TransportProfile }
  | { t: "local"; state: LocalState }
  | { t: "kick"; slot: number }
  | { t: "p2p-channel"; slot: number; channel: RTCDataChannel }
  | { t: "p2p-close"; slot: number }
  | { t: "signal"; slot: number; signal: P2pSignal }
  | { t: "close" };

export interface LinkStats {
  rttMs: number | null;
  sentKbps: number;
  sentPackets: number;
  /** Audio packets handed to the relay. It stops rising while every player is linked. */
  relayedPackets: number;
}

export interface PeerStats {
  slot: number;
  jitterMs: number;
  /** 99th percentile lateness, the figure the buffer is sized from. */
  latenessMs: number;
  lossPct: number;
  latePackets: number;
  bufferMs: number;
  targetMs: number;
  underruns: number;
  skips: number;
  receivedKbps: number;
  playing: boolean;
  /** Playout rate while drift is being corrected, 1 when on target. */
  rate: number;
  route: PeerRoute;
  /** Round trip over the link to this player, or null when the relay carries them. */
  p2pRttMs: number | null;
}

export type WorkerEvent =
  | { t: "live"; slot: number; peers: PeerInfo[]; maxDatagram: number; transport: TransportKind }
  | { t: "peer-joined"; peer: PeerInfo }
  | { t: "peer-left"; slot: number; reason: string }
  | { t: "peer-state"; slot: number; state: PublishedState }
  | { t: "signal"; slot: number; signal: P2pSignal }
  | { t: "closed"; code: number | null; reason: string }
  | { t: "stats"; link: LinkStats; peers: PeerStats[] }
  | { t: "error"; message: string };

/** Page to the capture worklet. */
export interface CaptureConfig {
  port?: MessagePort;
  frame?: number;
  mode?: ChannelModeValue;
  sending?: boolean;
}

/** Capture worklet to the worker: one frame of planar stereo audio. */
export interface CaptureFrame {
  timestamp: number;
  planar: Float32Array;
  /** True on the first frame after sending starts. */
  fresh: boolean;
}

/** Worker to a playback worklet. */
export type PlaybackCommand =
  | { pcm: Float32Array; frames: number }
  | { conceal: number }
  | { target: number; frame: number }
  | { reset: true };
