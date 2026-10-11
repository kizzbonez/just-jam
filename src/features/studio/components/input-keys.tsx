"use client";

import { Mic, MicOff } from "lucide-react";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import type { InputView } from "@/features/studio/engine/client/room-store";
import { Button } from "@/ui/primitives/button";
import { Notice } from "@/ui/primitives/notice";
import { Toggle } from "@/ui/primitives/toggle";
import { LedMeter } from "@/ui/rack/led-meter";
import { WaveScope } from "@/ui/rack/wave-scope";

/**
 * Level ladder for inputs 1 and 2 beside a scope of what is coming in. Until
 * an input is armed there is nothing to show, so it says what to do instead
 * of drawing a flat line that looks like a dead signal.
 */
export function InputMeters({ engine, armed }: { engine: StudioEngine; armed: boolean }) {
  const tap = engine.inputTap;
  if (!armed) {
    return (
      <div className="well flex h-24 flex-col items-center justify-center gap-1 border border-dashed border-etch-hi px-4 text-center">
        <span className="silk text-ink-soft">No input open</span>
        <span className="text-sm text-label">
          Press <span className="text-ink">Arm input</span> to open your interface.
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-stretch gap-3">
      <div className="flex h-24">
        <LedMeter read={tap.readPeaks} label="Input level, inputs 1 and 2" />
      </div>
      <WaveScope read={tap.readWave} label="Input waveform" />
    </div>
  );
}

/**
 * Monitoring through the browser goes in and out of the sound card, so it is
 * never instant. Says how late it is, and what to use instead.
 */
export function MonitorNotice({ engine, input }: { engine: StudioEngine; input: InputView }) {
  if (!input.armed || !input.monitor) return null;
  const delayMs = Math.round(input.latencyMs + engine.outputLatencyMs);
  return (
    <Notice>
      You hear yourself at least <span className="readout text-ink">{delayMs} ms</span> late. That
      is this computer recording and playing back, not the network. To hear yourself with no
      delay, turn Monitor off and use the direct monitoring on your audio interface.
    </Notice>
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
        <Toggle
          checked={input.muted}
          disabled={!input.armed}
          onChange={(on) => engine.setMuted(on)}
          label="Mute"
        />
        <Toggle
          checked={input.monitor}
          disabled={!input.armed}
          onChange={(on) => engine.setMonitor(on)}
          label="Monitor"
        />
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
