"use client";

import { CHANNEL_LABELS, CHANNEL_MODES } from "@/features/studio/audio-profile";
import type { ChannelModeValue } from "@/features/studio/audio-profile";
import { DeviceSelect } from "@/features/studio/components/device-select";
import { InputKeys, InputMeters } from "@/features/studio/components/input-keys";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { InputView, RoomState } from "@/features/studio/engine/client/room-store";
import { useDevices } from "@/features/studio/hooks/use-devices";
import { Field } from "@/ui/primitives/field";
import { Led } from "@/ui/primitives/led";
import { Notice } from "@/ui/primitives/notice";
import { Select } from "@/ui/primitives/select";
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

  function pickDevice(id: string) {
    const deviceId = id || null;
    if (input.armed) void arm(deviceId);
    else engine.store.setInput({ deviceId });
  }

  return (
    <RackUnit
      label="Input"
      code="TL-IN"
      aside={
        <span className="silk flex items-center gap-2">
          <Led on={status.live} /> {status.text}
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        {input.error && <Notice tone="error">{input.error}</Notice>}
        <DeviceSelect
          id="input-device"
          label="Audio interface"
          devices={devices.inputs}
          value={input.deviceId}
          savedLabel={input.label}
          hint={devices.labelled ? undefined : "Arm once to let the browser list your interfaces."}
          onChange={pickDevice}
        />
        <Field label="Channels" htmlFor="channel-mode">
          <Select
            id="channel-mode"
            value={profile.channelMode}
            onChange={(event) =>
              engine.setProfile({ channelMode: event.target.value as ChannelModeValue })
            }
          >
            {CHANNEL_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {CHANNEL_LABELS[mode]}
              </option>
            ))}
          </Select>
        </Field>
        <InputMeters engine={engine} armed={input.armed} />
        <InputKeys
          engine={engine}
          input={input}
          ready={state.phase === "live"}
          onArm={() => arm(input.deviceId)}
        />
      </div>
    </RackUnit>
  );
}
