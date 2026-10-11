"use client";

import { UserX, Volume2, VolumeX } from "lucide-react";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { PeerView } from "@/features/studio/engine/client/room-store";
import { cn } from "@/lib/cn";
import { Avatar } from "@/ui/primitives/avatar";
import { Badge } from "@/ui/primitives/badge";
import { Led } from "@/ui/primitives/led";

const avatarOf = (peer: PeerView) =>
  peer.ava > 0 ? `/api/users/${peer.userId}/avatar?v=${peer.ava}` : null;

const ROUTE_HINT = {
  p2p: "Audio travels straight between your browser and theirs.",
  relay: "Audio travels through the relay, because no link between your browsers is up.",
} as const;

/** Who is on this strip, how their audio reaches you, and whether they are sending right now. */
export function StripHeader({ peer }: { peer: PeerView }) {
  const sending = Boolean(peer.state?.armed && !peer.state.muted);
  const status = sending ? "Sending audio" : "Not sending";
  const route = peer.stats?.route;
  return (
    <header className="flex flex-col items-center gap-2 text-center">
      <div className="flex w-full items-center justify-between">
        <span className="readout text-[0.6875rem] text-steel-600">
          CH {String(peer.slot).padStart(2, "0")}
        </span>
        <span className="flex items-center" title={status}>
          <Led on={sending} />
          <span className="sr-only">{status}</span>
        </span>
      </div>
      <Avatar name={peer.name} src={avatarOf(peer)} />
      <span className="w-full truncate text-sm font-semibold text-ink">{peer.name}</span>
      <div className="flex flex-wrap justify-center gap-1">
        <Badge>{peer.inst}</Badge>
        {peer.host && <Badge tone="steel">Host</Badge>}
        {route && (
          <Badge tone={route === "p2p" ? "wine" : "steel"} className="cursor-help">
            <span title={ROUTE_HINT[route]}>{route === "p2p" ? "P2P" : "Relay"}</span>
          </Badge>
        )}
      </div>
    </header>
  );
}

const KEY =
  "flex h-8 flex-1 items-center justify-center rounded-[3px] border transition-colors disabled:opacity-40";
const KEY_IDLE = "border-etch-hi bg-carbon-800 text-ink-soft hover:text-ink";

export interface StripKeysProps {
  engine: StudioEngine;
  peer: PeerView;
  canKick: boolean;
}

/** Local mute for everyone, plus removal from the room for the host. */
export function StripKeys({ engine, peer, canKick }: StripKeysProps) {
  const { muted } = peer.mix;
  const MuteIcon = muted ? VolumeX : Volume2;

  function kick() {
    if (window.confirm(`Remove ${peer.name} from this room?`)) engine.kick(peer.slot);
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-pressed={muted}
        aria-label={`Mute ${peer.name} for me`}
        onClick={() => engine.setPeerMix(peer.slot, { muted: !muted })}
        className={cn(
          KEY,
          muted ? "border-crimson-600 bg-wine text-crimson-300 shadow-glow-sm" : KEY_IDLE,
        )}
      >
        <MuteIcon aria-hidden className="size-4" />
      </button>
      {canKick && (
        <button
          type="button"
          aria-label={`Remove ${peer.name} from the room`}
          onClick={kick}
          className={cn(KEY, KEY_IDLE, "hover:border-crimson-600 hover:text-crimson-300")}
        >
          <UserX aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
