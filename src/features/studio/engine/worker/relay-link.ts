/**
 * How the worker talks to the relay, whichever way the bytes travel.
 *
 *  - quic: WebTransport. Audio goes as unreliable datagrams, so a lost packet
 *    never delays the ones behind it. Needs the relay's UDP port reachable.
 *  - websocket: the fallback. It passes through any HTTPS proxy or tunnel, but
 *    it is TCP, so latency is higher and less steady.
 */
import type { TransportKind } from "@/features/studio/engine/messages";
import { QuicLink } from "@/features/studio/engine/worker/relay-session";
import { SocketLink } from "@/features/studio/engine/worker/relay-socket";

export interface RelayHandlers {
  onControl(message: Record<string, unknown>): void;
  onDatagram(data: Uint8Array, arrivalMs: number): void;
  onClosed(code: number | null, reason: string): void;
}

export interface RelayTarget {
  /** WebTransport endpoint, or null when it cannot be reached from this device. */
  url: string | null;
  /** Base64 SHA-256 of a self-signed relay certificate, or null for a CA-issued one. */
  certHash: string | null;
  /** WebSocket fallback endpoint, or null when the studio has none. */
  wsUrl: string | null;
  ticket: string;
}

export interface RelayLink {
  readonly kind: TransportKind;
  readonly maxDatagramSize: number;
  sendDatagram(data: Uint8Array): void;
  sendControl(message: object): void;
  close(): void;
}

/** A direct attempt that has not connected by now is treated as unreachable. */
const QUIC_TIMEOUT_MS = 3000;

/** Hands each line of a control message to the handler; malformed ones are ignored. */
export function dispatchControl(text: string, handlers: RelayHandlers): void {
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      handlers.onControl(JSON.parse(line) as Record<string, unknown>);
    } catch {
      // A malformed message is ignored rather than allowed to end the session.
    }
  }
}

/** Connects directly over QUIC when possible, otherwise through the fallback. */
export async function openRelay(target: RelayTarget, handlers: RelayHandlers): Promise<RelayLink> {
  if (target.url && "WebTransport" in self) {
    try {
      return await QuicLink.open({ ...target, url: target.url }, handlers, QUIC_TIMEOUT_MS);
    } catch (error) {
      if (!target.wsUrl) throw error;
    }
  }
  if (!target.wsUrl) throw new Error("The audio relay cannot be reached from this device.");
  return SocketLink.open(target.wsUrl, target.ticket, handlers);
}
