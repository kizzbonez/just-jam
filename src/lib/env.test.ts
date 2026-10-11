import { describe, expect, it } from "vitest";
import { isSafeSocketUrl } from "@/lib/env";

describe("isSafeSocketUrl", () => {
  it("accepts encrypted WebSocket addresses", () => {
    expect(isSafeSocketUrl("wss://relay.example.com")).toBe(true);
    expect(isSafeSocketUrl("wss://relay.example.com:8443/jam")).toBe(true);
  });

  it("accepts an unencrypted address only on this machine", () => {
    expect(isSafeSocketUrl("ws://127.0.0.1:4434")).toBe(true);
    expect(isSafeSocketUrl("ws://localhost:4434")).toBe(true);
    expect(isSafeSocketUrl("ws://relay.example.com")).toBe(false);
    expect(isSafeSocketUrl("ws://192.168.1.20:4434")).toBe(false);
  });

  it("refuses anything that is not a WebSocket address", () => {
    expect(isSafeSocketUrl("https://relay.example.com")).toBe(false);
    expect(isSafeSocketUrl("relay.example.com")).toBe(false);
    expect(isSafeSocketUrl("")).toBe(false);
  });
});
