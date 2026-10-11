/**
 * One WebRTC connection to another player. It exists only to open a data
 * channel between the two browsers. The audio on that channel is handled by
 * the transport worker, never here.
 *
 * Of each pair, the player in the lower slot makes the offers and the other
 * one answers, so the two can never talk over each other.
 */
import type { P2pSignal } from "@/features/studio/engine/messages";
import { MAX_CANDIDATES } from "@/features/studio/engine/p2p-signal";

/** Unordered and never retransmitted: a late audio packet is worth nothing. */
const CHANNEL: RTCDataChannelInit = { negotiated: true, id: 0, ordered: false, maxRetransmits: 0 };
const ICE_BATCH_MS = 80;
/** Waits before each new attempt after a connection fails. After the last, the relay keeps the job. */
const RETRY_DELAYS_MS = [3000, 10_000, 30_000];
const MAX_EARLY_CANDIDATES = 64;

export interface NegotiatorOptions {
  /** True for the side that makes the offers. */
  initiator: boolean;
  iceServers: RTCIceServer[];
  send(signal: P2pSignal): void;
}

export class PeerNegotiator {
  /** Hand this to the worker straight away: a channel cannot be moved once it is in use. */
  readonly channel: RTCDataChannel;
  private readonly pc: RTCPeerConnection;
  private outbox: RTCIceCandidateInit[] = [];
  /** Candidates that arrived before the description they belong to. */
  private early: RTCIceCandidateInit[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private retries = 0;

  constructor(private readonly options: NegotiatorOptions) {
    this.pc = new RTCPeerConnection({ iceServers: options.iceServers });
    this.channel = this.pc.createDataChannel("audio", CHANNEL);
    this.pc.onicecandidate = (event) => {
      if (event.candidate) this.queue(event.candidate.toJSON());
    };
    this.pc.onnegotiationneeded = () => {
      if (options.initiator) void this.describe("offer");
    };
    this.pc.onconnectionstatechange = () => this.onState();
  }

  /** Sets our description and sends it to the other player. */
  private async describe(kind: "offer" | "answer"): Promise<void> {
    try {
      await this.pc.setLocalDescription();
      const sdp = this.pc.localDescription?.sdp;
      if (sdp) this.options.send({ k: kind, sdp });
    } catch {
      // The connection was closed while negotiating.
    }
  }

  /** Applies a negotiation message from the other player. */
  async accept(signal: P2pSignal): Promise<void> {
    try {
      if (signal.k === "ice") return await this.addCandidates(signal.list);
      if (signal.k !== (this.options.initiator ? "answer" : "offer")) return;
      await this.pc.setRemoteDescription({ type: signal.k, sdp: signal.sdp });
      await this.addCandidates(this.early.splice(0));
      if (signal.k === "offer") await this.describe("answer");
    } catch {
      // A stale or malformed message from the other side is ignored.
    }
  }

  private async addCandidates(list: RTCIceCandidateInit[]): Promise<void> {
    if (!this.pc.remoteDescription) {
      if (this.early.length < MAX_EARLY_CANDIDATES) this.early.push(...list);
      return;
    }
    for (const candidate of list) {
      await this.pc.addIceCandidate(candidate).catch(() => undefined);
    }
  }

  /** Candidates are sent a few at a time, to stay under the relay's message limit. */
  private queue(candidate: RTCIceCandidateInit): void {
    this.outbox.push(candidate);
    if (this.outbox.length >= MAX_CANDIDATES) this.flush();
    else this.flushTimer ??= setTimeout(() => this.flush(), ICE_BATCH_MS);
  }

  private flush(): void {
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    const list = this.outbox.splice(0, MAX_CANDIDATES);
    if (list.length > 0) this.options.send({ k: "ice", list });
  }

  /** A failed connection is tried again a few times, by the side that makes offers. */
  private onState(): void {
    const state = this.pc.connectionState;
    if (state === "connected") this.retries = 0;
    if (state !== "failed" || !this.options.initiator) return;
    const delay = RETRY_DELAYS_MS[this.retries];
    if (delay === undefined) return;
    this.retries++;
    this.retryTimer = setTimeout(() => this.pc.restartIce(), delay);
  }

  close(): void {
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.pc.onicecandidate = this.pc.onnegotiationneeded = this.pc.onconnectionstatechange = null;
    this.pc.close();
  }
}
