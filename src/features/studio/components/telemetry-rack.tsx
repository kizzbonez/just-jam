"use client";

import { useState } from "react";
import { peerLatency } from "@/features/studio/components/peer-latency";
import { TelemetryReadouts } from "@/features/studio/components/telemetry-readouts";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { PeerView, RoomState } from "@/features/studio/engine/client/room-store";
import {
  HISTORY_POINTS,
  HISTORY_STEP_SECONDS,
} from "@/features/studio/engine/client/telemetry-history";
import { cn } from "@/lib/cn";
import { INK } from "@/ui/rack/canvas";
import { RackUnit } from "@/ui/rack/rack-unit";
import type { TraceSeries } from "@/ui/rack/trace-draw";
import { TraceScope } from "@/ui/rack/trace-scope";

export interface TelemetryRackProps {
  engine: StudioEngine;
  state: RoomState;
}

function PeerTabs(props: { peers: PeerView[]; selected: number; onSelect: (slot: number) => void }) {
  return (
    <div role="tablist" aria-label="Player" className="flex flex-wrap gap-1.5">
      {props.peers.map((peer) => {
        const active = peer.slot === props.selected;
        return (
          <button
            key={peer.slot}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => props.onSelect(peer.slot)}
            className={cn(
              "h-7 rounded-[3px] border px-2.5 font-display text-[0.8125rem] font-semibold tracking-[0.08em] uppercase transition-colors",
              active
                ? "border-crimson-600 bg-wine text-ink"
                : "border-etch-hi bg-carbon-800 text-label hover:text-ink",
            )}
          >
            {peer.name}
          </button>
        );
      })}
    </div>
  );
}

function seriesFor(engine: StudioEngine, slot: number): { series: TraceSeries[]; marks: boolean[] } {
  const view = engine.history.view(slot);
  const series: TraceSeries[] = [
    { key: "buffer", label: "Buffer held", values: view.bufferMs, stroke: INK.trace, width: 2, dash: [] },
    { key: "target", label: "Target", values: view.targetMs, stroke: INK.steel, width: 1.5, dash: [5, 4] },
    { key: "late", label: "Lateness p99", values: view.latenessMs, stroke: INK.steelDim, width: 1.5, dash: [1, 3] },
  ];
  return { series, marks: view.underrun };
}

/** Network and buffer telemetry for one remote player, over the last minute. */
export function TelemetryRack({ engine, state }: TelemetryRackProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const peer = state.peers.find((item) => item.slot === picked) ?? state.peers[0];

  if (!peer?.stats) {
    return (
      <RackUnit label="Telemetry" code="TL-TM">
        <p className="py-2 text-sm text-label">
          Jitter, loss and buffer traces appear here once another player is in the room.
        </p>
      </RackUnit>
    );
  }

  const { series, marks } = seriesFor(engine, peer.slot);
  return (
    <RackUnit
      label="Telemetry"
      code="TL-TM"
      aside={<PeerTabs peers={state.peers} selected={peer.slot} onSelect={setPicked} />}
    >
      <div className="flex flex-col gap-4">
        <TelemetryReadouts stats={peer.stats} latency={peerLatency(engine, state, peer)} />
        <TraceScope
          series={series}
          marks={marks}
          marksLabel="Dropout"
          unit="ms"
          points={HISTORY_POINTS}
          stepSeconds={HISTORY_STEP_SECONDS}
          label={`Buffer and lateness for ${peer.name} over the last minute, in milliseconds`}
        />
      </div>
    </RackUnit>
  );
}
