import { describe, expect, it } from "vitest";
import { describeAgent, formatUtc } from "@/lib/format";

describe("formatUtc", () => {
  it("renders a fixed UTC timestamp", () => {
    expect(formatUtc("2026-10-11T04:05:00.000Z")).toBe("11 Oct 2026, 04:05 UTC");
  });
});

describe("describeAgent", () => {
  it("names the browser and system", () => {
    const edge =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36 Edg/141.0";
    expect(describeAgent(edge)).toBe("Edge on Windows");
    expect(describeAgent("Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Firefox/140.0")).toBe(
      "Firefox on Linux",
    );
  });

  it("has a neutral answer for a missing header", () => {
    expect(describeAgent(null)).toBe("Unknown device");
  });
});
