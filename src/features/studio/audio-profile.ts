/**
 * The audio settings a player keeps between sessions. This module is pure and
 * shared by the server (validation), the UI and the audio engine.
 */

export const CHANNEL_MODES = ["STEREO", "MONO_LEFT", "MONO_RIGHT", "MONO_SUM"] as const;
export const CODECS = ["OPUS", "PCM16", "PCM24"] as const;
export const FRAME_MICROS = [2500, 5000, 10000, 20000] as const;
export const BITRATES_KBPS = [96, 128, 192, 256, 320, 510] as const;
export const BUFFER_MODES = ["AUTO", "MANUAL"] as const;

export type ChannelModeValue = (typeof CHANNEL_MODES)[number];
export type CodecValue = (typeof CODECS)[number];
export type FrameMicros = (typeof FRAME_MICROS)[number];
export type BufferModeValue = (typeof BUFFER_MODES)[number];

export const SAMPLE_RATE = 48_000;
export const CHANNELS = 2;
export const MIN_BUFFER_MS = 0;
export const MAX_BUFFER_MS = 200;

/**
 * Largest audio payload that fits one QUIC datagram after the 10-byte header.
 * Browsers report about 1215 bytes on a default path; this leaves headroom.
 */
export const MAX_PAYLOAD_BYTES = 1180;

export interface AudioProfile {
  inputDeviceId: string | null;
  inputLabel: string | null;
  outputDeviceId: string | null;
  channelMode: ChannelModeValue;
  codec: CodecValue;
  frameMicros: FrameMicros;
  bitrateKbps: number;
  bufferMode: BufferModeValue;
  bufferMs: number;
}

export const DEFAULT_PROFILE: AudioProfile = {
  inputDeviceId: null,
  inputLabel: null,
  outputDeviceId: null,
  channelMode: "STEREO",
  codec: "OPUS",
  frameMicros: 5000,
  bitrateKbps: 256,
  bufferMode: "AUTO",
  bufferMs: 20,
};

export const frameSamples = (frameMicros: number) => (SAMPLE_RATE * frameMicros) / 1_000_000;

const PCM_BYTES: Record<Exclude<CodecValue, "OPUS">, number> = { PCM16: 2, PCM24: 3 };

/** Bytes one frame occupies on the wire. Opus is its nominal constant bitrate. */
export function framePayloadBytes(profile: Pick<AudioProfile, "codec" | "frameMicros" | "bitrateKbps">) {
  if (profile.codec === "OPUS") {
    return Math.ceil((profile.bitrateKbps * 1000 * profile.frameMicros) / 8_000_000);
  }
  return frameSamples(profile.frameMicros) * CHANNELS * PCM_BYTES[profile.codec];
}

/** Uncompressed frames must fit one datagram, which rules out longer PCM frames. */
export function fitsDatagram(profile: Pick<AudioProfile, "codec" | "frameMicros" | "bitrateKbps">) {
  return framePayloadBytes(profile) <= MAX_PAYLOAD_BYTES;
}

/** Bits per second this profile sends, payload only. */
export function wireBitrate(profile: Pick<AudioProfile, "codec" | "frameMicros" | "bitrateKbps">) {
  return (framePayloadBytes(profile) * 8 * 1_000_000) / profile.frameMicros;
}

export const CODEC_LABELS: Record<CodecValue, string> = {
  OPUS: "Opus low-delay",
  PCM16: "PCM 16-bit",
  PCM24: "PCM 24-bit",
};

export const CHANNEL_LABELS: Record<ChannelModeValue, string> = {
  STEREO: "Stereo (inputs 1 + 2)",
  MONO_LEFT: "Mono from input 1",
  MONO_RIGHT: "Mono from input 2",
  MONO_SUM: "Mono sum of 1 + 2",
};
