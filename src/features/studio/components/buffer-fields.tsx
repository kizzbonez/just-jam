"use client";

import { MAX_BUFFER_MS, type AudioProfile } from "@/features/studio/audio-profile";
import { Toggle } from "@/ui/primitives/toggle";
import { Fader } from "@/ui/rack/fader";

export interface BufferFieldsProps {
  profile: AudioProfile;
  onChange: (patch: Partial<AudioProfile>) => void;
}

/** The slider stops short of the hard limit: beyond this, playing in time is not possible. */
const SLIDER_MAX_MS = Math.min(120, MAX_BUFFER_MS);

/** Adaptive on or off, and the fixed buffer size used when it is off. */
export function BufferFields({ profile, onChange }: BufferFieldsProps) {
  const adaptive = profile.bufferMode === "AUTO";
  return (
    <div className="flex flex-col gap-4">
      <Toggle
        checked={adaptive}
        onChange={(on) => onChange({ bufferMode: on ? "AUTO" : "MANUAL" })}
        label="Adaptive tuning"
      />
      <div className="flex items-center gap-4">
        <Fader
          min={0}
          max={SLIDER_MAX_MS}
          step={1}
          value={Math.min(profile.bufferMs, SLIDER_MAX_MS)}
          disabled={adaptive}
          onChange={(bufferMs) => onChange({ bufferMs })}
          label="Fixed buffer size"
          valueText={`${profile.bufferMs} milliseconds`}
        />
        <div className="well readout flex h-9 w-24 shrink-0 items-baseline justify-end gap-1 border border-etch px-2.5 pt-2">
          <span className={adaptive ? "text-steel-600" : "text-ink"}>
            {adaptive ? "auto" : profile.bufferMs}
          </span>
          {!adaptive && <span className="text-[0.625rem] text-label">ms</span>}
        </div>
      </div>
      <p className="text-sm text-label">
        {adaptive
          ? "Each player's buffer follows how unevenly their packets arrive, and grows after a dropout."
          : "Every player's buffer is held at this size. Lower it until you hear dropouts, then back off."}
      </p>
    </div>
  );
}
