"use client";

import { Mic, MicOff } from "lucide-react";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { InputView } from "@/features/studio/engine/client/room-store";
import { Button } from "@/ui/primitives/button";
import { Toggle } from "@/ui/primitives/toggle";
import { LedMeter } from "@/ui/rack/led-meter";
import { WaveScope } from "@/ui/rack/wave-scope";

/** Level ladder for inputs 1 and 2 beside a scope of what is coming in. */
export function InputMeters({ engine, armed }: { engine: StudioEngine; armed: boolean }) {
  const tap = engine.inputTap;
  return (
    <div className="flex items-stretch gap-3">
      <div className="flex h-24">
        <LedMeter read={armed ? tap.readPeaks : null} label="Input level, inputs 1 and 2" />
      </div>
      <WaveScope read={armed ? tap.readWave : null} label="Input waveform" />
    </div>
  );
}

export interface InputKeysProps {
  engine: StudioEngine;
  input: InputView;
  /** False until the room is live, when arming would send nowhere. */
  ready: boolean;
  onArm: () => void;
}

/** Mute and monitor switches, and the key that opens or releases the interface. */
export function InputKeys({ engine, input, ready, onArm }: InputKeysProps) {
  const ArmIcon = input.armed ? MicOff : Mic;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-x-5 gap-y-3">
        <Toggle checked={input.muted} onChange={(on) => engine.setMuted(on)} label="Mute" />
        <Toggle checked={input.monitor} onChange={(on) => engine.setMonitor(on)} label="Monitor" />
      </div>
      <Button
        variant={input.armed ? "steel" : "fire"}
        loading={input.busy}
        disabled={!ready}
        onClick={() => (input.armed ? engine.disarm() : onArm())}
        icon={<ArmIcon aria-hidden className="size-4" />}
      >
        {input.armed ? "Disarm" : "Arm input"}
      </Button>
    </div>
  );
}
