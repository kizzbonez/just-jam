/**
 * One WebTransport session to the relay: unreliable datagrams for audio and
 * pings, plus one reliable bidirectional stream carrying newline-delimited
 * JSON for presence and control.
 */

export interface RelayHandlers {
  onControl(message: Record<string, unknown>): void;
  onDatagram(data: Uint8Array, arrivalMs: number): void;
  onClosed(code: number | null, reason: string): void;
}

export interface RelayTarget {
  url: string;
  /** Base64 SHA-256 of a self-signed relay certificate, or null for a CA-issued one. */
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

export class RelaySession {
  private readonly encoder = new TextEncoder();

  private constructor(
    private readonly transport: WebTransport,
    private readonly control: WritableStreamDefaultWriter<Uint8Array>,
    private readonly datagrams: WritableStreamDefaultWriter<Uint8Array>,
  ) {}

  get maxDatagramSize(): number {
    return this.transport.datagrams.maxDatagramSize;
  }

  static async open(target: RelayTarget, handlers: RelayHandlers): Promise<RelaySession> {
    const url = `${target.url}/jam?ticket=${encodeURIComponent(target.ticket)}`;
    const transport = new WebTransport(url, transportOptions(target.certHash));
    await transport.ready;
    transport.datagrams.outgoingMaxAge = OUTGOING_MAX_AGE_MS;
    transport.datagrams.incomingMaxAge = INCOMING_MAX_AGE_MS;
    const stream = await transport.createBidirectionalStream();
    const session = new RelaySession(
      transport,
      stream.writable.getWriter(),
      transport.datagrams.writable.getWriter(),
    );
    // The relay only sees a stream once data flows on it.
    session.sendControl({ t: "hello" });
    void session.readControl(stream.readable, handlers);
    void session.readDatagrams(handlers);
    transport.closed
      .then((info) => handlers.onClosed(info.closeCode ?? null, info.reason ?? ""))
      .catch((error: unknown) => handlers.onClosed(null, String(error)));
    return session;
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
        let end = pending.indexOf("\n");
        while (end >= 0) {
          this.dispatch(pending.slice(0, end), handlers);
          pending = pending.slice(end + 1);
          end = pending.indexOf("\n");
        }
      }
    } catch {
      // The session closed; `transport.closed` reports why.
    }
  }

  private dispatch(line: string, handlers: RelayHandlers): void {
    try {
      handlers.onControl(JSON.parse(line) as Record<string, unknown>);
    } catch {
      // A malformed line is ignored rather than allowed to end the session.
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
