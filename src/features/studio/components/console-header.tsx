"use client";

import { Check, Link2, LogOut } from "lucide-react";
import { useState } from "react";
import type { RoomDoor } from "@/features/rooms/server/room-queries";
import type { RoomState } from "@/features/studio/engine/client/room-store";
import { formatMs } from "@/features/studio/latency";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Led } from "@/ui/primitives/led";

export interface ConsoleHeaderProps {
  door: RoomDoor;
  state: RoomState;
  onLeave: () => void;
}

const PHASE_TEXT = { connecting: "Connecting", live: "Live", closed: "Offline" } as const;

const TRANSPORT_HINT = {
  quic: "Direct to the relay over QUIC datagrams.",
  websocket: "Through the WebSocket fallback, because the relay's UDP port is not reachable here.",
} as const;

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="silk">{label}</span>
      <span className="readout text-sm text-ink">{value}</span>
      <span className="readout text-[0.625rem] text-label">{unit}</span>
    </div>
  );
}

/** The master section: which room this is, link health and the way out. */
export function ConsoleHeader({ door, state, onLeave }: ConsoleHeaderProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${door.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <header className="plate flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="flex flex-wrap items-center gap-2.5">
          <span className="truncate font-display text-2xl leading-none font-bold tracking-[0.06em] text-ink uppercase">
            {door.name}
          </span>
          {door.isHost && <Badge tone="steel">Host</Badge>}
          {state.transport && (
            <Badge
              tone={state.transport === "quic" ? "wine" : "steel"}
              className="cursor-help"
            >
              <span title={TRANSPORT_HINT[state.transport]}>
                {state.transport === "quic" ? "QUIC" : "WebSocket"}
              </span>
            </Badge>
          )}
        </h1>
        <span className="silk flex items-center gap-2" role="status">
          <Led on={state.phase === "live"} pulse={state.phase === "connecting"} />
          {PHASE_TEXT[state.phase]}
          <span className="readout tracking-normal text-steel-600 normal-case">{door.slug}</span>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Stat label="Relay RTT" value={formatMs(state.link.rttMs)} unit="ms" />
        <Stat label="Sending" value={state.link.sentKbps.toFixed(0)} unit="kbps" />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={copyLink}
            icon={
              copied ? <Check aria-hidden className="size-4" /> : <Link2 aria-hidden className="size-4" />
            }
          >
            {copied ? "Copied" : "Invite link"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={onLeave}
            icon={<LogOut aria-hidden className="size-4" />}
          >
            Leave
          </Button>
        </div>
      </div>
    </header>
  );
}
