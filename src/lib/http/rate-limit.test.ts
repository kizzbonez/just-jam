import { beforeEach, describe, expect, it } from "vitest";
import { allow, resetRateLimits, type RateRule } from "@/lib/http/rate-limit";

const RULE: RateRule = { name: "test", max: 3, windowMs: 1000 };

describe("allow", () => {
  beforeEach(resetRateLimits);

  it("allows up to the limit and blocks the next call", () => {
    const calls = [0, 1, 2, 3].map((offset) => allow(RULE, "a", 100 + offset));
    expect(calls).toEqual([true, true, true, false]);
  });

  it("counts each subject separately", () => {
    for (let i = 0; i < 3; i++) allow(RULE, "a", 100);
    expect(allow(RULE, "b", 100)).toBe(true);
  });

  it("starts a fresh window once the old one has passed", () => {
    for (let i = 0; i < 4; i++) allow(RULE, "a", 100);
    expect(allow(RULE, "a", 1100)).toBe(true);
  });
});
