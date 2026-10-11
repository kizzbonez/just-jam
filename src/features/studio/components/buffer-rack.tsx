"use client";

import { BufferFields } from "@/features/studio/components/buffer-fields";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { RoomState } from "@/features/studio/engine/client/room-store";
import { Led } from "@/ui/primitives/led";
import { RackUnit } from "@/ui/rack/rack-unit";

/** How much audio is held before playback: the trade between latency and dropouts. */
export function BufferRack({ engine, state }: { engine: StudioEngine; state: RoomState }) {
  const adaptive = state.profile.bufferMode === "AUTO";
  return (
    <RackUnit
      label="Jitter buffer"
      code="TL-JB"
      aside={
        <span className="silk flex items-center gap-2">
          <Led on={adaptive} /> {adaptive ? "Adaptive" : "Fixed"}
        </span>
      }
    >
      <BufferFields profile={state.profile} onChange={(patch) => engine.setProfile(patch)} />
    </RackUnit>
  );
}
