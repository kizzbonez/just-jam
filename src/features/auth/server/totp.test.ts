import { describe, expect, it } from "vitest";
import { checkTotp, currentTotpCode, newTotpSecret, totpUri } from "@/features/auth/server/totp";

const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);
const STEP = 30_000;

describe("checkTotp", () => {
  const secret = newTotpSecret();

  it("accepts the current code and reports its time step", () => {
    const code = currentTotpCode(secret, NOW);
    expect(checkTotp({ secret, code, lastCounter: null, now: NOW })).toBe(NOW / STEP);
  });

  it("tolerates one step of clock drift in either direction", () => {
    const early = currentTotpCode(secret, NOW - STEP);
    const late = currentTotpCode(secret, NOW + STEP);
    expect(checkTotp({ secret, code: early, lastCounter: null, now: NOW })).not.toBeNull();
    expect(checkTotp({ secret, code: late, lastCounter: null, now: NOW })).not.toBeNull();
  });

  it("rejects a code that is two steps old", () => {
    const stale = currentTotpCode(secret, NOW - 2 * STEP);
    expect(checkTotp({ secret, code: stale, lastCounter: null, now: NOW })).toBeNull();
  });

  it("refuses to accept the same step twice", () => {
    const code = currentTotpCode(secret, NOW);
    const counter = checkTotp({ secret, code, lastCounter: null, now: NOW });
    expect(checkTotp({ secret, code, lastCounter: counter, now: NOW })).toBeNull();
  });

  it("rejects a code for a different secret", () => {
    const code = currentTotpCode(newTotpSecret(), NOW);
    expect(checkTotp({ secret, code, lastCounter: null, now: NOW })).toBeNull();
  });
});

describe("totpUri", () => {
  it("names the issuer and the account", () => {
    const uri = totpUri(newTotpSecret(), "ana@example.com");
    expect(uri).toMatch(/^otpauth:\/\/totp\/ToneLink:ana(@|%40)example\.com\?/);
    expect(uri).toContain("issuer=ToneLink");
  });
});
