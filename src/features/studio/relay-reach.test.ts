import { describe, expect, it } from "vitest";
import { relayReachProblem } from "@/features/studio/relay-reach";

describe("relayReachProblem", () => {
  it("is silent when the studio is used on the machine that runs it", () => {
    expect(relayReachProblem("https://127.0.0.1:4433", "127.0.0.1")).toBeNull();
    expect(relayReachProblem("https://127.0.0.1:4433", "localhost")).toBeNull();
  });

  it("is silent when the relay has a reachable address", () => {
    expect(relayReachProblem("https://relay.example.com:4433", "studio.example.com")).toBeNull();
    expect(relayReachProblem("https://192.168.1.20:4433", "studio.example.com")).toBeNull();
  });

  it("explains a loopback relay to a visitor on another machine", () => {
    const problem = relayReachProblem("https://127.0.0.1:4433", "studio.example.com");
    expect(problem).toMatch(/local use only \(127\.0\.0\.1\)/);
    expect(problem).toMatch(/RELAY_PUBLIC_URL/);
    expect(relayReachProblem("https://localhost:4433", "192.168.1.50")).not.toBeNull();
  });

  it("reports an address that is not a URL", () => {
    expect(relayReachProblem("not a url", "studio.example.com")).toMatch(/not a valid URL/);
  });
});
