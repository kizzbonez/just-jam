"use client";

import { ChannelStrip } from "@/features/studio/components/channel-strip";
import { peerLatency } from "@/features/studio/components/peer-latency";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { RoomState } from "@/features/studio/engine/client/room-store";
import { CopyField } from "@/ui/patterns/copy-field";
import { RackUnit } from "@/ui/rack/rack-unit";

export interface MixerRackProps {
  engine: StudioEngine;
  state: RoomState;
  slug: string;
  isHost: boolean;
}

/** The mix you hear: one strip per other player. Changes here affect only you. */
export function MixerRack({ engine, state, slug, isHost }: MixerRackProps) {
  const count = state.peers.length;
  return (
    <RackUnit
      label="Mixer"
      code="TL-MX"
      aside={
        <span className="silk">
          <span className="readout mr-1.5 text-ink">{String(count).padStart(2, "0")}</span>
          {count === 1 ? "player" : "players"}
        </span>
      }
    >
      {count === 0 ? (
        <div className="flex max-w-lg flex-col gap-3 py-2">
          <p className="text-sm text-ink-soft">
            Nobody else is here yet. Send this link to the people you want to play with. Each
            player who joins gets a strip here.
          </p>
          <CopyField value={`${globalThis.location?.origin ?? ""}/room/${slug}`} label="room link" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {state.peers.map((peer) => (
            <ChannelStrip
              key={peer.slot}
              engine={engine}
              peer={peer}
              latencyMs={peerLatency(engine, state, peer)?.totalMs ?? null}
              canKick={isHost}
            />
          ))}
        </div>
      )}
    </RackUnit>
  );
}
