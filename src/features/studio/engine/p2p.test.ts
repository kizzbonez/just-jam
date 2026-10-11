import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseStunUrls } from "@/features/rooms/server/p2p-config";
import { MAX_CANDIDATES, parseSignal } from "@/features/studio/engine/p2p-signal";
import { RouteGate } from "@/features/studio/engine/route-gate";
import { Pacer } from "@/features/studio/engine/worker/pacer";

describe("RouteGate", () => {
  it("plays whichever path a player's audio first arrives on", () => {
    const gate = new RouteGate();
    expect(gate.admit(2, "relay", 0)).toBe("pass");
    expect(gate.admit(2, "relay", 5)).toBe("pass");
    expect(gate.admit(3, "p2p", 0)).toBe("pass");
  });

  it("starts a new stream when the link takes over from the relay", () => {
    const gate = new RouteGate();
    gate.admit(2, "relay", 0);
    expect(gate.admit(2, "p2p", 10)).toBe("switch");
    expect(gate.admit(2, "p2p", 15)).toBe("pass");
  });

  it("drops relayed stragglers while the link is delivering", () => {
    const gate = new RouteGate();
    gate.admit(2, "relay", 0);
    gate.admit(2, "p2p", 10);
    // Sent before the link came up, and still crossing the slower relay path.
    expect(gate.admit(2, "relay", 180)).toBe("drop");
    expect(gate.admit(2, "p2p", 185)).toBe("pass");
    expect(gate.admit(2, "relay", 600)).toBe("drop");
  });

  it("goes back to the relay once the link has been silent for a while", () => {
    const gate = new RouteGate();
    gate.admit(2, "p2p", 0);
    expect(gate.admit(2, "relay", 499)).toBe("drop");
    expect(gate.admit(2, "relay", 2100)).toBe("switch");
    expect(gate.admit(2, "relay", 2105)).toBe("pass");
    expect(gate.admit(2, "p2p", 2110)).toBe("switch");
  });

  it("keeps each player's path separate and forgets a player who left", () => {
    const gate = new RouteGate();
    gate.admit(2, "p2p", 0);
    expect(gate.admit(3, "relay", 1)).toBe("pass");
    gate.forget(2);
    expect(gate.admit(2, "relay", 2)).toBe("pass");
  });
});

describe("parseSignal", () => {
  const candidate = { candidate: "candidate:1 1 udp 2122260223 192.0.2.7 50000 typ host", sdpMid: "0", sdpMLineIndex: 0 };

  it("accepts offers and answers that carry a description", () => {
    expect(parseSignal({ k: "offer", sdp: "v=0" })).toEqual({ k: "offer", sdp: "v=0" });
    expect(parseSignal({ k: "answer", sdp: "v=0", extra: 1 })).toEqual({ k: "answer", sdp: "v=0" });
  });

  it("accepts a batch of candidates and keeps only the fields WebRTC reads", () => {
    const parsed = parseSignal({ k: "ice", list: [{ ...candidate, junk: true }] });
    expect(parsed).toEqual({ k: "ice", list: [candidate] });
  });

  it("refuses anything malformed or oversized", () => {
    expect(parseSignal(null)).toBeNull();
    expect(parseSignal("offer")).toBeNull();
    expect(parseSignal({ k: "offer" })).toBeNull();
    expect(parseSignal({ k: "offer", sdp: "x".repeat(5001) })).toBeNull();
    expect(parseSignal({ k: "rollback", sdp: "v=0" })).toBeNull();
    expect(parseSignal({ k: "ice", list: "nope" })).toBeNull();
    expect(parseSignal({ k: "ice", list: [{ candidate: 7 }] })).toBeNull();
    expect(parseSignal({ k: "ice", list: [{ candidate: "x".repeat(401) }] })).toBeNull();
    const tooMany = Array.from({ length: MAX_CANDIDATES + 1 }, () => candidate);
    expect(parseSignal({ k: "ice", list: tooMany })).toBeNull();
  });
});

describe("parseStunUrls", () => {
  it("reads a comma separated list and ignores what is not a STUN address", () => {
    expect(parseStunUrls("stun:a.example:3478, stuns:b.example:5349")).toEqual([
      "stun:a.example:3478",
      "stuns:b.example:5349",
    ]);
    expect(parseStunUrls("none")).toEqual([]);
    expect(parseStunUrls("https://a.example, turn:b.example, stun:")).toEqual([]);
  });
});

describe("Pacer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends the first message at once and spaces out the rest, in order", () => {
    const sent: number[] = [];
    const pacer = new Pacer<number>((item) => sent.push(item));
    [1, 2, 3].forEach((item) => pacer.push(item));
    expect(sent).toEqual([1]);
    vi.advanceTimersByTime(40);
    expect(sent).toEqual([1, 2]);
    vi.advanceTimersByTime(40);
    expect(sent).toEqual([1, 2, 3]);
  });

  it("stays under the relay's limit of 60 control messages a second", () => {
    const sent: number[] = [];
    const pacer = new Pacer<number>((item) => sent.push(item));
    for (let item = 0; item < 200; item++) pacer.push(item);
    vi.advanceTimersByTime(1000);
    expect(sent.length).toBeLessThanOrEqual(30);
  });

  it("sends nothing more after it is cleared", () => {
    const sent: number[] = [];
    const pacer = new Pacer<number>((item) => sent.push(item));
    [1, 2, 3].forEach((item) => pacer.push(item));
    pacer.clear();
    vi.advanceTimersByTime(500);
    expect(sent).toEqual([1]);
  });
});
