"use client";

import { useCallback, useRef } from "react";
import { Led } from "@/ui/primitives/led";
import { LedMeter } from "@/ui/rack/led-meter";
import { RackUnit } from "@/ui/rack/rack-unit";
import { Readout } from "@/ui/rack/readout";
import { WaveScope } from "@/ui/rack/wave-scope";

/** A slow four-note phrase, in Hz. */
const NOTES = [196, 220, 247, 294];
const BEAT = 0.9;
const TWO_PI = Math.PI * 2;

/** One plucked string at time `t` seconds: a fundamental and two harmonics, decaying. */
function pluck(t: number): number {
  const note = NOTES[Math.floor(t / BEAT) % NOTES.length];
  const local = t % BEAT;
  const body =
    Math.sin(TWO_PI * note * local) +
    0.45 * Math.sin(TWO_PI * note * 2 * local) +
    0.2 * Math.sin(TWO_PI * note * 3 * local);
  return body * envelope(local) * 0.5;
}

/** A sharp attack that settles into a sustained ring. */
const envelope = (local: number) => 0.3 + 0.7 * Math.exp(-local * 3);

/** The scope shows a wider slice of time than real audio would, so the shape reads. */
const SCOPE_STEP = 1 / 24_000;

/**
 * A demonstration signal for the home page: no microphone, no network. It is
 * frozen when the visitor asks for reduced motion.
 */
function useDemoSignal() {
  const still = useRef<boolean | null>(null);

  const now = useCallback(() => {
    still.current ??= window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return still.current ? 0.12 : performance.now() / 1000;
  }, []);

  const readWave = useCallback(
    (out: Float32Array) => {
      const start = now();
      for (let i = 0; i < out.length; i++) out[i] = pluck(start + i * SCOPE_STEP);
    },
    [now],
  );

  const readPeaks = useCallback(
    (out: Float32Array) => {
      const level = envelope(now() % BEAT);
      out[0] = level * 0.66;
      out[1] = level * 0.52;
    },
    [now],
  );

  return { readWave, readPeaks };
}

/** The hero's working model of a channel: meters and a scope fed by a synthetic string. */
export function HeroRig() {
  const { readWave, readPeaks } = useDemoSignal();
  return (
    <RackUnit
      label="Signal"
      code="TL-DEMO"
      aside={
        <span className="silk flex items-center gap-2">
          <Led on pulse /> Demo
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-stretch gap-3">
          <div className="flex h-40">
            <LedMeter read={readPeaks} label="Demonstration level meter" />
          </div>
          <WaveScope read={readWave} label="Demonstration waveform" className="h-40" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Readout label="Frame" value="5.0" unit="ms" />
          <Readout label="Codec" value="OPUS" />
          <Readout label="Carrier" value="QUIC" />
        </div>
      </div>
    </RackUnit>
  );
}
