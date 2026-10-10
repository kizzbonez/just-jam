import { describe, expect, it } from "vitest";
import { open, seal } from "@/lib/crypto/secretbox";

describe("secretbox", () => {
  it("round-trips a value", () => {
    expect(open(seal("JBSWY3DPEHPK3PXP", "totp"), "totp")).toBe("JBSWY3DPEHPK3PXP");
  });

  it("produces a different ciphertext each time", () => {
    expect(seal("same", "totp")).not.toBe(seal("same", "totp"));
  });

  it("does not open under another purpose", () => {
    expect(open(seal("value", "totp"), "enrollment")).toBeNull();
  });

  it("rejects tampered or truncated input", () => {
    const sealed = seal("value", "totp");
    const flipped = sealed.slice(0, -2) + (sealed.endsWith("AA") ? "BB" : "AA");
    expect(open(flipped, "totp")).toBeNull();
    expect(open("short", "totp")).toBeNull();
  });
});
