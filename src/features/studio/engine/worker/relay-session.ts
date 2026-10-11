/**
 * The direct path: one WebTransport session to the relay. Unreliable datagrams
 * carry audio and pings; one reliable bidirectional stream carries
 * newline-delimited JSON for presence and control.
 */
import {
  dispatchControl,
  type RelayHandlers,
  type RelayLink,
} from "@/features/studio/engine/worker/relay-link";

interface QuicTarget {
  url: string;
  certHash: string | null;
  ticket: string;
}

/** Audio older than this is worthless: drop it rather than queue it. */
const OUTGOING_MAX_AGE_MS = 40;
const INCOMING_MAX_AGE_MS = 150;

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function transportOptions(certHash: string | null): WebTransportOptions {
  const options: WebTransportOptions = { congestionControl: "low-latency" };
  if (certHash) {
    options.serverCertificateHashes = [{ algorithm: "sha-256", value: decodeBase64(certHash) }];
  }
  return options;
}

const sleep = (ms: number) => new Promise<false>((resolve) => setTimeout(() => resolve(false), ms));

export class QuicLink implements RelayLink {
  readonly kind = "quic";
  private readonly encoder = new TextEncoder();

  private constructor(
    private readonly transport: WebTransport,
    private readonly control: WritableStreamDefaultWriter<Uint8Array>,
    private readonly datagrams: WritableStreamDefaultWriter<Uint8Array>,
  ) {}

  get maxDatagramSize(): number {
    return this.transport.datagrams.maxDatagramSize;
  }

  /** Rejects when the session is not ready within `timeoutMs`, so a fallback can be tried. */
  static async open(target: QuicTarget, handlers: RelayHandlers, timeoutMs: number) {
    const url = `${target.url}/jam?ticket=${encodeURIComponent(target.ticket)}`;
    const transport = new WebTransport(url, transportOptions(target.certHash));
    let adopted = false;
    transport.closed
      .then((info) => adopted && handlers.onClosed(info.closeCode ?? null, info.reason ?? ""))
      .catch((error: unknown) => adopted && handlers.onClosed(null, String(error)));
    const ready = await Promise.race([transport.ready.then(() => true), sleep(timeoutMs)]);
    if (!ready) {
      transport.close();
      throw new Error("The relay did not answer over QUIC.");
    }
    adopted = true;
    transport.datagrams.outgoingMaxAge = OUTGOING_MAX_AGE_MS;
    transport.datagrams.incomingMaxAge = INCOMING_MAX_AGE_MS;
    const stream = await transport.createBidirectionalStream();
    const link = new QuicLink(
      transport,
      stream.writable.getWriter(),
      transport.datagrams.writable.getWriter(),
    );
    // The relay only sees a stream once data flows on it.
    link.sendControl({ t: "hello" });
    void link.readControl(stream.readable, handlers);
    void link.readDatagrams(handlers);
    return link;
  }

  private async readDatagrams(handlers: RelayHandlers): Promise<void> {
    const reader = this.transport.datagrams.readable.getReader();
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        handlers.onDatagram(value as Uint8Array, performance.now());
      }
    } catch {
      // The session closed; `transport.closed` reports why.
    }
  }

  private async readControl(readable: ReadableStream<Uint8Array>, handlers: RelayHandlers) {
    const reader = readable.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        pending += decoder.decode(value, { stream: true });
        const end = pending.lastIndexOf("\n");
        if (end < 0) continue;
        dispatchControl(pending.slice(0, end), handlers);
        pending = pending.slice(end + 1);
      }
    } catch {
      // The session closed; `transport.closed` reports why.
    }
  }

  sendDatagram(data: Uint8Array): void {
    this.datagrams.write(data).catch(() => undefined);
  }

  sendControl(message: object): void {
    const line = this.encoder.encode(`${JSON.stringify(message)}\n`);
    this.control.write(line).catch(() => undefined);
  }

  close(): void {
    try {
      this.transport.close({ closeCode: 0, reason: "left" });
    } catch {
      // Already closed.
    }
  }
}
