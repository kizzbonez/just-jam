"use client";

import { InputKeys, InputMeters, MonitorNotice } from "@/features/studio/components/input-keys";
import { InterfaceFields } from "@/features/studio/components/interface-fields";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { InputView, RoomState } from "@/features/studio/engine/client/room-store";
import { useDevices } from "@/features/studio/hooks/use-devices";
import { Led } from "@/ui/primitives/led";
import { Notice } from "@/ui/primitives/notice";
import { RackUnit } from "@/ui/rack/rack-unit";

export interface InputRackProps {
  engine: StudioEngine;
  state: RoomState;
}

function statusOf(input: InputView): { live: boolean; text: string } {
  if (!input.armed) return { live: false, text: "Idle" };
  return input.muted ? { live: false, text: "Muted" } : { live: true, text: "Sending" };
}

/** Your side of the room: pick the interface, arm it, watch what it sends. */
export function InputRack({ engine, state }: InputRackProps) {
  const { devices, refresh } = useDevices();
  const { input, profile } = state;
  const status = statusOf(input);

  async function arm(deviceId: string | null) {
    await engine.arm(deviceId);
    refresh();
  }

  function pickInput(deviceId: string | null) {
    if (input.armed) void arm(deviceId);
    else engine.store.setInput({ deviceId });
  }

  return (
    <RackUnit
      label="Interface"
      code="TL-IO"
      aside={
        <span className="silk flex items-center gap-2">
          <Led on={status.live} /> {status.text}
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        {input.error && <Notice tone="error">{input.error}</Notice>}
        <InterfaceFields
          devices={devices}
          input={input}
          profile={profile}
          onInput={pickInput}
          onOutput={(deviceId) => void engine.setOutputDevice(deviceId)}
          onChannels={(channelMode) => engine.setProfile({ channelMode })}
        />
        <InputMeters engine={engine} armed={input.armed} />
        <InputKeys
          engine={engine}
          input={input}
          ready={state.phase === "live"}
          onArm={() => arm(input.deviceId)}
        />
        <MonitorNotice engine={engine} input={input} />
      </div>
    </RackUnit>
  );
}
