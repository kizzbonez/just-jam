import { describe, expect, it } from "vitest";
import {
  FLOOR_DB,
  idleChannel,
  litSegments,
  stepMeter,
  toDb,
} from "@/ui/rack/meter-ballistics";
import { niceMax } from "@/ui/rack/trace-draw";

describe("meter ballistics", () => {
  it("converts linear level to dBFS with a floor", () => {
    expect(toDb(1)).toBeCloseTo(0, 6);
    expect(toDb(0.5)).toBeCloseTo(-6.02, 2);
    expect(toDb(0)).toBe(FLOOR_DB);
  });

  it("jumps up at once and falls at a steady rate", () => {
    const channel = idleChannel();
    stepMeter(channel, 0.5, 0.016);
    expect(channel.level).toBeCloseTo(-6.02, 2);
    stepMeter(channel, 0, 0.5);
    expect(channel.level).toBeCloseTo(-6.02 - 13, 1);
  });

  it("holds the peak marker, then lets it go", () => {
    const channel = idleChannel();
    stepMeter(channel, 1, 0.016);
    stepMeter(channel, 0, 0.5);
    expect(channel.hold).toBeCloseTo(0, 6);
    stepMeter(channel, 0, 1.0);
    expect(channel.hold).toBeLessThan(-20);
  });

  it("latches the clip lamp for two seconds", () => {
    const channel = idleChannel();
    stepMeter(channel, 1, 0.016);
    stepMeter(channel, 0.1, 1.5);
    expect(channel.clip).toBeGreaterThan(0);
    stepMeter(channel, 0.1, 1);
    expect(channel.clip).toBe(0);
  });

  it("maps level onto segments", () => {
    expect(litSegments(FLOOR_DB, 22)).toBe(0);
    expect(litSegments(0, 22)).toBe(22);
    expect(litSegments(-30, 22)).toBe(11);
    expect(litSegments(12, 22)).toBe(22);
  });
});

describe("niceMax", () => {
  it("rounds up to an axis maximum that divides into four", () => {
    expect(niceMax(3)).toBe(8);
    expect(niceMax(34)).toBe(40);
    expect(niceMax(41)).toBe(60);
    expect(niceMax(199)).toBe(200);
    expect(niceMax(950)).toBe(1000);
  });
});
