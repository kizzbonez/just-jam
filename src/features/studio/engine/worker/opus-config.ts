import { CHANNELS, SAMPLE_RATE } from "@/features/studio/audio-profile";
import type { TransportProfile } from "@/features/studio/engine/messages";

/**
 * Picks the most latency-friendly Opus encoder setup the browser accepts.
 * `application: "lowdelay"` selects the CELT-only mode with 2.5 ms of
 * lookahead instead of 6.5 ms. Older engines do not know the option, so the
 * list falls back step by step.
 */
export async function pickEncoderConfig(profile: TransportProfile): Promise<AudioEncoderConfig> {
  const base = {
    codec: "opus",
    sampleRate: SAMPLE_RATE,
    numberOfChannels: CHANNELS,
    bitrate: profile.bitrateKbps * 1000,
  };
  const frameDuration = profile.frameMicros;
  const plain = { format: "opus", frameDuration, usedtx: false, useinbandfec: false };
  const candidates = [
    {
      ...base,
      bitrateMode: "constant",
      opus: { ...plain, application: "lowdelay", signal: "music", complexity: 9 },
    },
    { ...base, opus: plain },
    { ...base, opus: { frameDuration } },
  ] as AudioEncoderConfig[];
  for (const candidate of candidates) {
    const support = await AudioEncoder.isConfigSupported(candidate);
    if (support.supported) return candidate;
  }
  throw new Error("This browser cannot encode Opus at the selected frame size.");
}

export const DECODER_CONFIG: AudioDecoderConfig = {
  codec: "opus",
  sampleRate: SAMPLE_RATE,
  numberOfChannels: CHANNELS,
};
