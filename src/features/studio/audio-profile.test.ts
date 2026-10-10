import { describe, expect, it } from "vitest";
import { AudioProfileSchema } from "@/features/profile/schemas";
import {
  DEFAULT_PROFILE,
  fitsDatagram,
  framePayloadBytes,
  frameSamples,
  wireBitrate,
} from "@/features/studio/audio-profile";

describe("frame maths", () => {
  it("converts frame duration to samples at 48 kHz", () => {
    expect(frameSamples(2500)).toBe(120);
    expect(frameSamples(5000)).toBe(240);
    expect(frameSamples(20000)).toBe(960);
  });

  it("sizes PCM frames exactly", () => {
    const pcm16 = { codec: "PCM16", frameMicros: 5000, bitrateKbps: 256 } as const;
    const pcm24 = { codec: "PCM24", frameMicros: 2500, bitrateKbps: 256 } as const;
    expect(framePayloadBytes(pcm16)).toBe(960);
    expect(framePayloadBytes(pcm24)).toBe(720);
    expect(wireBitrate(pcm16)).toBe(1_536_000);
  });

  it("sizes Opus frames from the bitrate", () => {
    expect(framePayloadBytes({ codec: "OPUS", frameMicros: 5000, bitrateKbps: 256 })).toBe(160);
  });
});

describe("fitsDatagram", () => {
  it("allows Opus at every frame size up to 320 kbps", () => {
    for (const frameMicros of [2500, 5000, 10000, 20000] as const) {
      expect(fitsDatagram({ codec: "OPUS", frameMicros, bitrateKbps: 320 })).toBe(true);
    }
  });

  it("refuses the one Opus combination that overflows a datagram", () => {
    expect(fitsDatagram({ codec: "OPUS", frameMicros: 10000, bitrateKbps: 510 })).toBe(true);
    expect(fitsDatagram({ codec: "OPUS", frameMicros: 20000, bitrateKbps: 510 })).toBe(false);
  });

  it("allows short PCM frames and refuses ones that would not fit", () => {
    expect(fitsDatagram({ codec: "PCM16", frameMicros: 5000, bitrateKbps: 256 })).toBe(true);
    expect(fitsDatagram({ codec: "PCM16", frameMicros: 10000, bitrateKbps: 256 })).toBe(false);
    expect(fitsDatagram({ codec: "PCM24", frameMicros: 2500, bitrateKbps: 256 })).toBe(true);
    expect(fitsDatagram({ codec: "PCM24", frameMicros: 5000, bitrateKbps: 256 })).toBe(false);
  });
});

describe("AudioProfileSchema", () => {
  it("accepts the defaults", () => {
    expect(AudioProfileSchema.safeParse(DEFAULT_PROFILE).success).toBe(true);
  });

  it("points at the frame size when the combination cannot be sent", () => {
    const result = AudioProfileSchema.safeParse({
      ...DEFAULT_PROFILE,
      codec: "PCM24",
      frameMicros: 10000,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["frameMicros"]);
  });

  it("rejects values outside the offered options", () => {
    expect(AudioProfileSchema.safeParse({ ...DEFAULT_PROFILE, frameMicros: 3000 }).success).toBe(
      false,
    );
    expect(AudioProfileSchema.safeParse({ ...DEFAULT_PROFILE, bufferMs: 900 }).success).toBe(false);
  });
});
