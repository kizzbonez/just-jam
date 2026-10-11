"use client";

import { framePayloadBytes, wireBitrate } from "@/features/studio/audio-profile";
import { TransportFields } from "@/features/studio/components/transport-fields";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { RoomState } from "@/features/studio/engine/client/room-store";
import { RackUnit } from "@/ui/rack/rack-unit";
import { Readout } from "@/ui/rack/readout";

/** What you send: codec, frame size and bitrate, changeable while playing. */
export function TransportRack({ engine, state }: { engine: StudioEngine; state: RoomState }) {
  const { profile } = state;
  const packetsPerSecond = 1_000_000 / profile.frameMicros;
  return (
    <RackUnit label="Transport" code="TL-TX">
      <div className="flex flex-col gap-4">
        <TransportFields
          profile={profile}
          onChange={(patch) => engine.setProfile(patch)}
          idPrefix="live"
        />
        <div className="grid grid-cols-3 gap-3">
          <Readout label="On the wire" value={(wireBitrate(profile) / 1000).toFixed(0)} unit="kbps" />
          <Readout label="Packets" value={packetsPerSecond.toFixed(0)} unit="/s" />
          <Readout label="Payload" value={framePayloadBytes(profile)} unit="B" />
        </div>
        <p className="text-sm text-label">
          Shorter frames cut latency and send more packets. Each frame travels as one datagram of
          at most {state.maxDatagram || "about 1200"} bytes.
        </p>
      </div>
    </RackUnit>
  );
}
