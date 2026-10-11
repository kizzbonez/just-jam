"use client";

import type { AudioDevice } from "@/features/studio/engine/client/capture";
import { Field } from "@/ui/primitives/field";
import { Select } from "@/ui/primitives/select";

export interface DeviceSelectProps {
  id: string;
  label: string;
  devices: AudioDevice[];
  value: string | null;
  /** Shown when the saved device is not currently plugged in. */
  savedLabel?: string | null;
  disabled?: boolean;
  hint?: string;
  onChange: (deviceId: string) => void;
}

/** Picks one audio interface. Keeps a saved device visible even when it is unplugged. */
export function DeviceSelect(props: DeviceSelectProps) {
  const { id, label, devices, value, savedLabel, disabled, hint, onChange } = props;
  const missing = value !== null && !devices.some((device) => device.id === value);
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <Select
        id={id}
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">System default</option>
        {missing && <option value={value}>{savedLabel ?? "Saved device"} (not connected)</option>}
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}
