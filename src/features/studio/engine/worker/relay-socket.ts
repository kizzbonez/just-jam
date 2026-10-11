/**
 * The fallback path: a WebSocket to the relay. Binary messages are the same
 * packets that would travel as datagrams; text messages are control JSON.
 */
import {
  dispatchControl,
  type RelayHandlers,
  type RelayLink,
} from "@/features/studio/engine/worker/relay-link";

/** The relay accepts packets up to this size on either transport. */
const MAX_PACKET_BYTES = 1400;

/**
 * TCP queues instead of dropping. Once this much is waiting to go out, new
 * audio is skipped, because queued audio only arrives late.
 */
const MAX_BUFFERED_BYTES = 24_000;

const NORMAL_CLOSE = 1000;

export class SocketLink implements RelayLink {
  readonly kind = "websocket";
  readonly maxDatagramSize = MAX_PACKET_BYTES;

  private constructor(private readonly socket: WebSocket) {}

  static open(wsUrl: string, ticket: string, handlers: RelayHandlers): Promise<SocketLink> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`${wsUrl}/jam?ticket=${encodeURIComponent(ticket)}`);
      socket.binaryType = "arraybuffer";
      let opened = false;
      socket.onopen = () => {
        opened = true;
        resolve(new SocketLink(socket));
      };
      socket.onmessage = (event: MessageEvent<string | ArrayBuffer>) => {
        if (typeof event.data === "string") dispatchControl(event.data, handlers);
        else handlers.onDatagram(new Uint8Array(event.data), performance.now());
      };
      socket.onclose = (event) => {
        if (!opened) return reject(new Error("Could not reach the audio relay."));
        handlers.onClosed(event.code === NORMAL_CLOSE ? 0 : event.code, event.reason);
      };
    });
  }

  sendDatagram(data: Uint8Array): void {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    if (this.socket.bufferedAmount > MAX_BUFFERED_BYTES) return;
    this.socket.send(data as Uint8Array<ArrayBuffer>);
  }

  sendControl(message: object): void {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  close(): void {
    this.socket.close(NORMAL_CLOSE, "left");
  }
}
