import { describe, expect, it } from "vitest";
import {
  AUDIO_HEADER_BYTES,
  decodeAudio,
  decodePong,
  encodeAudio,
  encodePing,
  FLAG_DISCONTINUITY,
  sequenceGap,
  timestampDelta,
  TYPE_PONG,
} from "@/features/studio/engine/wire";

describe("audio datagrams", () => {
  const payload = new Uint8Array([1, 2, 3, 4, 5]);
  const header = {
    codec: "PCM24",
    frameMicros: 2500,
    flags: FLAG_DISCONTINUITY,
    sequence: 65_535,
    timestamp: 4_294_967_000,
  } as const;

  it("round-trips every header field and the payload", () => {
    const datagram = encodeAudio(header, payload);
    expect(datagram.byteLength).toBe(AUDIO_HEADER_BYTES + payload.byteLength);
    datagram[1] = 7; // the relay stamps the source slot
    expect(decodeAudio(datagram)).toMatchObject({ ...header, slot: 7 });
    expect([...decodeAudio(datagram)!.payload]).toEqual([...payload]);
  });

  it("decodes from a view into a larger buffer", () => {
    const datagram = encodeAudio({ ...header, sequence: 12 }, payload);
    const padded = new Uint8Array(datagram.byteLength + 8);
    padded.set(datagram, 4);
    const packet = decodeAudio(padded.subarray(4, 4 + datagram.byteLength));
    expect(packet?.sequence).toBe(12);
    expect(packet?.timestamp).toBe(header.timestamp);
  });

  it("rejects other datagram types, empty payloads and unknown codecs", () => {
    expect(decodeAudio(encodePing(1))).toBeNull();
    expect(decodeAudio(encodeAudio(header, new Uint8Array()))).toBeNull();
    const unknown = encodeAudio(header, payload);
    unknown[2] = 0xf0;
    expect(decodeAudio(unknown)).toBeNull();
  });
});

describe("ping", () => {
  it("carries the sender clock through an echo", () => {
    const ping = encodePing(123_456.789);
    expect(decodePong(ping)).toBeNull();
    ping[0] = TYPE_PONG;
    expect(decodePong(ping)).toBeCloseTo(123_456.789, 6);
  });
});

describe("sequence arithmetic", () => {
  it("measures gaps forward, including across the wrap", () => {
    expect(sequenceGap(10, 10)).toBe(0);
    expect(sequenceGap(13, 10)).toBe(3);
    expect(sequenceGap(2, 65_534)).toBe(4);
  });

  it("reports late packets as negative, including across the wrap", () => {
    expect(sequenceGap(9, 10)).toBe(-1);
    expect(sequenceGap(65_535, 1)).toBe(-2);
  });

  it("subtracts timestamps across the 32-bit wrap", () => {
    expect(timestampDelta(100, 4_294_967_196)).toBe(200);
    expect(timestampDelta(4_294_967_196, 100)).toBe(-200);
  });
});
