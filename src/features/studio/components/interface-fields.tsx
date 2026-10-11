"use client";

import { CHANNEL_LABELS, CHANNEL_MODES } from "@/features/studio/audio-profile";
import type { AudioProfile, ChannelModeValue } from "@/features/studio/audio-profile";
import { DeviceSelect } from "@/features/studio/components/device-select";
import type { DeviceList } from "@/features/studio/engine/client/capture";
import type { InputView } from "@/features/studio/engine/client/room-store";
import { Field } from "@/ui/primitives/field";
import { Select } from "@/ui/primitives/select";

export interface InterfaceFieldsProps {
  devices: DeviceList;
  input: InputView;
  profile: AudioProfile;
  onInput: (deviceId: string | null) => void;
  onOutput: (deviceId: string | null) => void;
  onChannels: (mode: ChannelModeValue) => void;
}

/** Which interface to record from, how its two inputs are routed, where to play back. */
export function InterfaceFields(props: InterfaceFieldsProps) {
  const { devices, input, profile } = props;
  return (
    <>
      <DeviceSelect
        id="input-device"
        label="Audio interface"
        devices={devices.inputs}
        value={input.deviceId}
        savedLabel={input.label}
        hint={devices.labelled ? undefined : "Arm once to let the browser list your interfaces."}
        onChange={(id) => props.onInput(id || null)}
      />
      <Field label="Channels" htmlFor="channel-mode">
        <Select
          id="channel-mode"
          value={profile.channelMode}
          onChange={(event) => props.onChannels(event.target.value as ChannelModeValue)}
        >
          {CHANNEL_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {CHANNEL_LABELS[mode]}
            </option>
          ))}
        </Select>
      </Field>
      {devices.outputs.length > 0 && (
        <DeviceSelect
          id="output-device"
          label="Playback device"
          devices={devices.outputs}
          value={profile.outputDeviceId}
          onChange={(id) => props.onOutput(id || null)}
        />
      )}
    </>
  );
}
