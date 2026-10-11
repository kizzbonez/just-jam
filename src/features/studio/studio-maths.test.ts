import { describe, expect, it } from "vitest";
import { coerceProfile } from "@/features/studio/audio-profile";
import { describeClose, canRejoin } from "@/features/studio/engine/client/close-reasons";
import {
  HISTORY_POINTS,
  TelemetryHistory,
} from "@/features/studio/engine/client/telemetry-history";
import type { PeerStats } from "@/features/studio/engine/messages";
import { estimateLatency, formatMs } from "@/features/studio/latency";

describe("coerceProfile", () => {
  it("leaves a profile that already fits alone", () => {
    const profile = { codec: "OPUS", frameMicros: 5000, bitrateKbps: 256 } as const;
    expect(coerceProfile(profile)).toBe(profile);
  });

  it("shortens the frame to the longest one that fits", () => {
    expect(coerceProfile({ codec: "PCM16", frameMicros: 20000, bitrateKbps: 256 }).frameMicros).toBe(
      5000,
    );
    expect(coerceProfile({ codec: "PCM24", frameMicros: 5000, bitrateKbps: 256 }).frameMicros).toBe(
      2500,
    );
    expect(coerceProfile({ codec: "OPUS", frameMicros: 20000, bitrateKbps: 510 }).frameMicros).toBe(
      10000,
    );
  });
});

describe("estimateLatency", () => {
  const parts = {
    senderInputMs: 10,
    frameMs: 5,
    codec: "OPUS",
    senderRttMs: 8,
    receiverRttMs: 12,
    bufferMs: 14,
    outputMs: 20,
  } as const;

  it("adds up capture, framing, network, buffer and output", () => {
    const latency = estimateLatency(parts);
    expect(latency.framingMs).toBe(5); // half a frame plus 2.5 ms of Opus lookahead
    expect(latency.networkMs).toBe(10); // half of each round trip
    expect(latency.totalMs).toBe(10 + 5 + 10 + 14 + 20);
  });

  it("charges no lookahead for PCM", () => {
    expect(estimateLatency({ ...parts, codec: "PCM16" }).framingMs).toBe(2.5);
  });
});

describe("formatMs", () => {
  it("shows one decimal under 100 and none above", () => {
    expect(formatMs(12.345)).toBe("12.3");
    expect(formatMs(116.4)).toBe("116");
  });

  it("shows a dash for missing values", () => {
    expect(formatMs(null)).toBe("--");
    expect(formatMs(undefined)).toBe("--");
    expect(formatMs(Number.NaN)).toBe("--");
  });
});

describe("close reasons", () => {
  it("explains known relay codes and offers a rejoin only when it can work", () => {
    expect(describeClose(4003, "")).toBe("The host removed you from this room.");
    expect(describeClose(4005, "")).toBe("The host closed this room.");
    expect(canRejoin(4003)).toBe(false);
    expect(canRejoin(4005)).toBe(false);
    expect(canRejoin(4004)).toBe(true);
    expect(canRejoin(null)).toBe(true);
  });

  it("falls back to a generic sentence for an unexplained drop", () => {
    expect(describeClose(null, "")).toMatch(/connection to the audio relay was lost/);
  });
});

function stat(slot: number, bufferMs: number, underruns: number): PeerStats {
  return {
    slot,
    bufferMs,
    targetMs: bufferMs + 1,
    latenessMs: 2,
    underruns,
    jitterMs: 0,
    lossPct: 0,
    latePackets: 0,
    skips: 0,
    receivedKbps: 0,
    playing: true,
    rate: 1,
  };
}

describe("TelemetryHistory", () => {
  it("returns samples oldest first and flags steps with a new underrun", () => {
    const history = new TelemetryHistory();
    history.push([stat(2, 10, 0)]);
    history.push([stat(2, 11, 0)]);
    history.push([stat(2, 12, 1)]);
    const view = history.view(2);
    expect(view.bufferMs).toEqual([10, 11, 12]);
    expect(view.underrun).toEqual([false, false, true]);
  });

  it("keeps one minute and drops the oldest beyond that", () => {
    const history = new TelemetryHistory();
    for (let i = 0; i < HISTORY_POINTS + 10; i++) history.push([stat(1, i, 0)]);
    const view = history.view(1);
    expect(view.bufferMs).toHaveLength(HISTORY_POINTS);
    expect(view.bufferMs[0]).toBe(10);
    expect(view.bufferMs.at(-1)).toBe(HISTORY_POINTS + 9);
  });

  it("forgets a player who left", () => {
    const history = new TelemetryHistory();
    history.push([stat(3, 5, 0)]);
    history.drop(3);
    expect(history.view(3).bufferMs).toEqual([]);
  });
});
