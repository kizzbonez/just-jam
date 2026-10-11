/**
 * Datagram layout shared with the relay (relay/wire.go).
 *
 * Audio:  [0] 0xA1  [1] source slot (stamped by the relay)  [2] codec<<4 | frame code
 *         [3] flags  [4..5] sequence u16  [6..9] timestamp u32 (samples)  [10..] payload
 * Ping:   [0] 0xB1  [1] 0  [2..9] sender clock, float64 ms. Echoed back as 0xB2.
 */
import type { CodecValue, FrameMicros } from "@/features/studio/audio-profile";

export const TYPE_AUDIO = 0xa1;
export const TYPE_PING = 0xb1;
export const TYPE_PONG = 0xb2;
export const AUDIO_HEADER_BYTES = 10;
const PING_BYTES = 10;

/** Set on the first packet after the sender arms or unmutes: timing starts over. */
export const FLAG_DISCONTINUITY = 0x01;

const CODEC_IDS: Record<CodecValue, number> = { OPUS: 0, PCM16: 1, PCM24: 2 };
const CODEC_NAMES: CodecValue[] = ["OPUS", "PCM16", "PCM24"];
const FRAME_CODES: FrameMicros[] = [2500, 5000, 10000, 20000];

export interface AudioHeader {
  codec: CodecValue;
  frameMicros: FrameMicros;
  flags: number;
  /** Wraps at 65536. */
  sequence: number;
  /** Sample index of the first sample, on the sender's clock. Wraps at 2^32. */
  timestamp: number;
}

export interface AudioPacket extends AudioHeader {
  slot: number;
  payload: Uint8Array;
}

export function encodeAudio(header: AudioHeader, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(AUDIO_HEADER_BYTES + payload.byteLength);
  const view = new DataView(out.buffer);
  out[0] = TYPE_AUDIO;
  out[2] = (CODEC_IDS[header.codec] << 4) | FRAME_CODES.indexOf(header.frameMicros);
  out[3] = header.flags;
  view.setUint16(4, header.sequence & 0xffff);
  view.setUint32(6, header.timestamp >>> 0);
  out.set(payload, AUDIO_HEADER_BYTES);
  return out;
}

/** Returns null for anything that is not a well-formed audio datagram. */
export function decodeAudio(data: Uint8Array): AudioPacket | null {
  if (data.byteLength <= AUDIO_HEADER_BYTES || data[0] !== TYPE_AUDIO) return null;
  const codec = CODEC_NAMES[data[2] >> 4];
  const frameMicros = FRAME_CODES[data[2] & 0x0f];
  if (!codec || !frameMicros) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    slot: data[1],
    codec,
    frameMicros,
    flags: data[3],
    sequence: view.getUint16(4),
    timestamp: view.getUint32(6),
    payload: data.subarray(AUDIO_HEADER_BYTES),
  };
}

export function encodePing(nowMs: number): Uint8Array {
  const out = new Uint8Array(PING_BYTES);
  out[0] = TYPE_PING;
  new DataView(out.buffer).setFloat64(2, nowMs);
  return out;
}

/** The clock value from a pong, or null when the datagram is not one. */
export function decodePong(data: Uint8Array): number | null {
  if (data.byteLength !== PING_BYTES || data[0] !== TYPE_PONG) return null;
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getFloat64(2);
}

/**
 * Signed distance from `expected` to `sequence` in 16-bit sequence space.
 * Negative means the packet is older than expected (late or duplicated).
 */
export function sequenceGap(sequence: number, expected: number): number {
  return ((sequence - expected + 0x8000) & 0xffff) - 0x8000;
}

/** Signed difference between two wrapping 32-bit sample timestamps. */
export function timestampDelta(later: number, earlier: number): number {
  return (later - earlier) | 0;
}
