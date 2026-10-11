"use client";

import { frameSamples } from "@/features/studio/audio-profile";
import { ChannelStrip } from "@/features/studio/components/channel-strip";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { PeerView, RoomState } from "@/features/studio/engine/client/room-store";
import { estimateLatency } from "@/features/studio/latency";
import { CopyField } from "@/ui/patterns/copy-field";
import { RackUnit } from "@/ui/rack/rack-unit";

export interface MixerRackProps {
  engine: StudioEngine;
  state: RoomState;
  slug: string;
  isHost: boolean;
}

/** End-to-end estimate for one player, or null until both sides have reported. */
export function peerLatencyMs(engine: StudioEngine, state: RoomState, peer: PeerView) {
  if (!peer.state || !peer.stats?.playing) return null;
  const frameMs = (frameSamples(peer.state.frameMicros) / 48_000) * 1000;
  return estimateLatency({
    senderInputMs: peer.state.inputLatencyMs,
    frameMs,
    codec: peer.state.codec,
    senderRttMs: peer.state.rttMs,
    receiverRttMs: state.link.rttMs ?? 0,
    bufferMs: peer.stats.bufferMs,
    outputMs: engine.outputLatencyMs,
  }).totalMs;
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
      className="h-full"
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
              latencyMs={peerLatencyMs(engine, state, peer)}
              canKick={isHost}
            />
          ))}
        </div>
      )}
    </RackUnit>
  );
}
