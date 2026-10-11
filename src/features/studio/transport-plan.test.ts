import { describe, expect, it } from "vitest";
import { planTransport, type TransportInputs } from "@/features/studio/transport-plan";

const local: TransportInputs = {
  relayUrl: "https://127.0.0.1:4433",
  relayWsUrl: null,
  pageHostname: "127.0.0.1",
  search: "",
  hasWebTransport: true,
};

const remote: TransportInputs = { ...local, pageHostname: "studio.example.com" };
const fallback = "wss://relay.example.com";

describe("planTransport", () => {
  it("goes direct when the studio is used on its own machine", () => {
    expect(planTransport(local)).toEqual({ ok: true, direct: true });
  });

  it("goes direct to a relay with a reachable address", () => {
    const plan = planTransport({ ...remote, relayUrl: "https://relay.example.com:4433" });
    expect(plan).toEqual({ ok: true, direct: true });
  });

  it("skips QUIC for a loopback relay seen from another device, when there is a fallback", () => {
    expect(planTransport({ ...remote, relayWsUrl: fallback })).toEqual({ ok: true, direct: false });
  });

  it("explains a loopback relay when there is no fallback", () => {
    const plan = planTransport(remote);
    expect(plan.ok).toBe(false);
    expect(plan.ok ? "" : plan.problem).toMatch(/local use only/);
  });

  it("uses the fallback in a browser without WebTransport", () => {
    const plan = planTransport({ ...local, hasWebTransport: false, relayWsUrl: fallback });
    expect(plan).toEqual({ ok: true, direct: false });
  });

  it("says so when the browser lacks WebTransport and there is no fallback", () => {
    const plan = planTransport({ ...local, hasWebTransport: false });
    expect(plan.ok ? "" : plan.problem).toMatch(/lacks WebTransport/);
  });

  it("honours a forced fallback, and reports when none is configured", () => {
    const forced = { ...local, search: "?transport=websocket" };
    expect(planTransport({ ...forced, relayWsUrl: fallback })).toEqual({ ok: true, direct: false });
    const plan = planTransport(forced);
    expect(plan.ok ? "" : plan.problem).toMatch(/no WebSocket fallback/);
  });
});
