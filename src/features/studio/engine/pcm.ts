/**
 * Uncompressed transport: planar float audio to and from interleaved
 * little-endian integer PCM. Planar means all left samples, then all right.
 */

const clamp = (value: number) => (value > 1 ? 1 : value < -1 ? -1 : value);

export function packPcm16(planar: Float32Array, frames: number): Uint8Array {
  const out = new Uint8Array(frames * 4);
  const view = new DataView(out.buffer);
  for (let i = 0; i < frames; i++) {
    view.setInt16(i * 4, Math.round(clamp(planar[i]) * 32767), true);
    view.setInt16(i * 4 + 2, Math.round(clamp(planar[frames + i]) * 32767), true);
  }
  return out;
}

export function unpackPcm16(payload: Uint8Array): Float32Array {
  const frames = payload.byteLength >> 2;
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  const planar = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    planar[i] = view.getInt16(i * 4, true) / 32767;
    planar[frames + i] = view.getInt16(i * 4 + 2, true) / 32767;
  }
  return planar;
}

const MAX_24 = 8_388_607;

function writeInt24(out: Uint8Array, offset: number, sample: number): void {
  const value = Math.round(clamp(sample) * MAX_24);
  out[offset] = value & 0xff;
  out[offset + 1] = (value >> 8) & 0xff;
  out[offset + 2] = (value >> 16) & 0xff;
}

function readInt24(data: Uint8Array, offset: number): number {
  const value = data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
  // Shift up and back down to sign-extend from 24 bits.
  return ((value << 8) >> 8) / MAX_24;
}

export function packPcm24(planar: Float32Array, frames: number): Uint8Array {
  const out = new Uint8Array(frames * 6);
  for (let i = 0; i < frames; i++) {
    writeInt24(out, i * 6, planar[i]);
    writeInt24(out, i * 6 + 3, planar[frames + i]);
  }
  return out;
}

export function unpackPcm24(payload: Uint8Array): Float32Array {
  const frames = Math.floor(payload.byteLength / 6);
  const planar = new Float32Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    planar[i] = readInt24(payload, i * 6);
    planar[frames + i] = readInt24(payload, i * 6 + 3);
  }
  return planar;
}
