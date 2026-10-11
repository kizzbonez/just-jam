/**
 * Decides, per player, which path's packets are played. A player's audio
 * arrives either over a link between the two browsers or through the relay,
 * and for a moment after a change of path it can arrive by both. The two paths
 * differ in delay, so mixing them would scramble the timing.
 */
import type { PeerRoute } from "@/features/studio/engine/messages";

/**
 * How long after the last linked packet a relayed one is still treated as a
 * straggler from before the link came up. Longer than the slowest relay path
 * worth playing through, shorter than the time a dead link takes to be noticed.
 */
const HOLD_MS = 500;

/** `switch` means: play it, but as the start of a new stream. */
export type Verdict = "pass" | "switch" | "drop";

interface Route {
  path: PeerRoute;
  linkedAt: number;
}

export class RouteGate {
  private readonly routes = new Map<number, Route>();

  admit(slot: number, path: PeerRoute, nowMs: number): Verdict {
    const route = this.routes.get(slot);
    if (!route) {
      this.routes.set(slot, { path, linkedAt: path === "p2p" ? nowMs : -Infinity });
      return "pass";
    }
    if (path === "p2p") {
      route.linkedAt = nowMs;
      if (route.path === "p2p") return "pass";
      route.path = "p2p";
      return "switch";
    }
    if (route.path === "relay") return "pass";
    if (nowMs - route.linkedAt < HOLD_MS) return "drop";
    route.path = "relay";
    return "switch";
  }

  forget(slot: number): void {
    this.routes.delete(slot);
  }
}
