import { describe, expect, it } from "vitest";
import { isTrustedOrigin } from "@/lib/http/origin";

describe("isTrustedOrigin", () => {
  it("accepts a request from the host it arrived on", () => {
    expect(isTrustedOrigin("http://localhost:3410", "localhost:3410")).toBe(true);
  });

  it("accepts the configured app URL and extra origins", () => {
    expect(isTrustedOrigin("http://127.0.0.1:3410", "web:3000")).toBe(true);
    expect(isTrustedOrigin("https://jam.example.com", "web:3000")).toBe(true);
  });

  it("rejects another site", () => {
    expect(isTrustedOrigin("https://evil.example", "127.0.0.1:3410")).toBe(false);
  });

  it("rejects a missing or malformed origin", () => {
    expect(isTrustedOrigin(null, "127.0.0.1:3410")).toBe(false);
    expect(isTrustedOrigin("not a url", "127.0.0.1:3410")).toBe(false);
  });
});
