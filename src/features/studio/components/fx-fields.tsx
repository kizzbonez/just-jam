"use client";

import type { ReactNode } from "react";
import {
  ECHO_MS,
  MAX_ECHO_REPEATS,
  REVERB_LABELS,
  REVERB_SIZES,
  type FxSettings,
  type ReverbSize,
} from "@/features/studio/engine/fx";
import { Select } from "@/ui/primitives/select";
import { Toggle } from "@/ui/primitives/toggle";
import { Fader } from "@/ui/rack/fader";

export interface FxFieldsProps {
  settings: FxSettings;
  onChange: (patch: Partial<FxSettings>) => void;
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** One send: its name, the fader and what the fader is set to. */
function FxRow({ name, text, children }: { name: string; text: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="silk w-16 shrink-0">{name}</span>
      {children}
      <span className="readout w-14 shrink-0 text-right text-xs text-ink">{text}</span>
    </div>
  );
}

function ReverbRows({ settings, onChange }: FxFieldsProps) {
  return (
    <>
      <FxRow name="Reverb" text={percent(settings.reverb)}>
        <Fader
          value={settings.reverb}
          onChange={(reverb) => onChange({ reverb })}
          label="Reverb level"
          valueText={percent(settings.reverb)}
        />
      </FxRow>
      <Select
        id="fx-room"
        aria-label="Reverb room"
        value={settings.reverbSize}
        onChange={(event) => onChange({ reverbSize: event.target.value as ReverbSize })}
      >
        {REVERB_SIZES.map((size) => (
          <option key={size} value={size}>
            {REVERB_LABELS[size]}
          </option>
        ))}
      </Select>
    </>
  );
}

function EchoRows({ settings, onChange }: FxFieldsProps) {
  const repeats = settings.echoRepeats / MAX_ECHO_REPEATS;
  return (
    <>
      <FxRow name="Echo" text={percent(settings.echo)}>
        <Fader
          value={settings.echo}
          onChange={(echo) => onChange({ echo })}
          label="Echo level"
          valueText={percent(settings.echo)}
        />
      </FxRow>
      <FxRow name="Time" text={`${settings.echoMs} ms`}>
        <Fader
          min={ECHO_MS.min}
          max={ECHO_MS.max}
          step={ECHO_MS.step}
          value={settings.echoMs}
          onChange={(echoMs) => onChange({ echoMs })}
          label="Echo time"
          valueText={`${settings.echoMs} milliseconds`}
        />
      </FxRow>
      <FxRow name="Repeats" text={percent(repeats)}>
        <Fader
          max={MAX_ECHO_REPEATS}
          value={settings.echoRepeats}
          onChange={(echoRepeats) => onChange({ echoRepeats })}
          label="Echo repeats"
          valueText={percent(repeats)}
        />
      </FxRow>
    </>
  );
}

/** Reverb and echo on your input. Everyone in the room hears them. */
export function FxFields({ settings, onChange }: FxFieldsProps) {
  return (
    <fieldset className="etch-t flex flex-col gap-3 pt-4">
      <legend className="silk float-left mb-1 w-full">Effects, heard by everyone</legend>
      <ReverbRows settings={settings} onChange={onChange} />
      <EchoRows settings={settings} onChange={onChange} />
      <Toggle
        checked={settings.monitorWetOnly}
        onChange={(monitorWetOnly) => onChange({ monitorWetOnly })}
        label="Monitor effects only"
      />
      <p className="text-sm text-label">
        For use with your interface&apos;s direct monitoring: you hear yourself dry through the
        interface, and Monitor adds only the reverb and echo.
      </p>
    </fieldset>
  );
}
