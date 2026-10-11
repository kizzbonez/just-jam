"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RoomTicket } from "@/features/rooms/server/issue-ticket";
import type { AudioProfile } from "@/features/studio/audio-profile";
import { collectDiagnostics } from "@/features/studio/engine/client/diagnostics";
import { StudioEngine } from "@/features/studio/engine/client/engine";
import type { RoomState } from "@/features/studio/engine/client/room-store";
import { planTransport } from "@/features/studio/transport-plan";

export interface EngineHandle {
  engine: StudioEngine | null;
  /** Set when the engine could not start at all, for example in an unsupported browser. */
  startError: string | null;
}

/** What the engine needs from every browser, whichever way it reaches the relay. */
const REQUIRED: [string, () => boolean][] = [
  ["WebCodecs audio", () => "AudioEncoder" in window && "AudioDecoder" in window],
  ["AudioWorklet", () => "AudioWorkletNode" in window],
];

type DiagnosticsWindow = Window & { __tonelink?: { diagnostics: () => unknown } };

/** Publishes a read-only snapshot function while a room is open. */
function exposeDiagnostics(engine: StudioEngine | null): void {
  const target = window as DiagnosticsWindow;
  if (engine) target.__tonelink = { diagnostics: () => collectDiagnostics(engine) };
  else delete target.__tonelink;
}

export function missingFeatures(): string[] {
  return REQUIRED.filter(([, present]) => !present()).map(([name]) => name);
}

/** Checks the browser and the route to the relay. Throws with a message for the player. */
function preflight(ticket: RoomTicket): { direct: boolean; p2p: boolean } {
  const missing = missingFeatures();
  if (missing.length > 0) {
    throw new Error(`This browser lacks ${missing.join(", ")}. Use a current Chrome or Edge.`);
  }
  const plan = planTransport({
    relayUrl: ticket.relayUrl,
    relayWsUrl: ticket.relayWsUrl,
    pageHostname: window.location.hostname,
    search: window.location.search,
    hasWebTransport: "WebTransport" in window,
    hasPeerConnection: "RTCPeerConnection" in window,
  });
  if (!plan.ok) throw new Error(plan.problem);
  return plan;
}

/**
 * Starts an engine for the ticket and tears it down when the component goes
 * away, including when the route is hidden, so audio never outlives the room.
 */
export function useStudioEngine(ticket: RoomTicket, profile: AudioProfile): EngineHandle {
  const [handle, setHandle] = useState<EngineHandle>({ engine: null, startError: null });

  useEffect(() => {
    let cancelled = false;
    let engine: StudioEngine | null = null;
    const start = async () => {
      const route = preflight(ticket);
      engine = await StudioEngine.create(profile);
      if (cancelled) return engine.dispose();
      engine.connect(ticket, route);
      exposeDiagnostics(engine);
      setHandle({ engine, startError: null });
    };
    start().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "The audio engine could not start.";
      if (!cancelled) setHandle({ engine: null, startError: message });
    });
    return () => {
      cancelled = true;
      exposeDiagnostics(null);
      engine?.dispose();
      setHandle({ engine: null, startError: null });
    };
    // The profile is only the starting point; later changes go through the engine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  return handle;
}

export function useRoomState(engine: StudioEngine): RoomState {
  return useSyncExternalStore(engine.store.subscribe, engine.store.getState, engine.store.getState);
}
