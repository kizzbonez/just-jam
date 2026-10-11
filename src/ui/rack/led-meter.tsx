"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { INK, prepare, type Surface } from "@/ui/rack/canvas";
import {
  idleChannel,
  litSegments,
  stepMeter,
  type MeterChannel,
} from "@/ui/rack/meter-ballistics";
import { useRaf } from "@/ui/rack/use-raf";

const SEGMENTS = 22;
const GAP = 2;
/** Segments from the top that light in the brighter "hot" shade. */
const HOT = 4;

export interface LedMeterProps {
  /** Writes the current linear peak of each channel into `out`. */
  read: ((out: Float32Array) => void) | null;
  label: string;
  className?: string;
}

function segmentColor(index: number, lit: number, channel: MeterChannel): string {
  const top = index === SEGMENTS - 1;
  if (top && channel.clip > 0) return INK.ledPeak;
  if (index >= lit) return INK.ledOff;
  return index >= SEGMENTS - HOT ? INK.ledHigh : INK.ledOn;
}

function drawChannel(surface: Surface, channel: MeterChannel, column: number): void {
  const { context, width, height } = surface;
  const barWidth = (width - GAP) / 2;
  const x = column * (barWidth + GAP);
  const step = height / SEGMENTS;
  const lit = litSegments(channel.level, SEGMENTS);
  const held = litSegments(channel.hold, SEGMENTS) - 1;
  for (let index = 0; index < SEGMENTS; index++) {
    const marker = index === held && held >= lit;
    context.fillStyle = marker ? INK.soft : segmentColor(index, lit, channel);
    context.fillRect(x, height - (index + 1) * step + 1, barWidth, step - GAP);
  }
}

/**
 * Stereo LED peak ladder: red segments, a brighter top band, a held-peak
 * marker and a clip lamp. Drawn on a canvas at display refresh rate, so it
 * never causes a React render.
 */
export function LedMeter({ read, label, className }: LedMeterProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({
    peaks: new Float32Array(2),
    channels: [idleChannel(), idleChannel()],
    last: 0,
  });

  useRaf(() => {
    const surface = prepare(canvas.current);
    if (!surface) return;
    const meter = state.current;
    const now = performance.now();
    const dt = Math.min(0.1, (now - (meter.last || now)) / 1000);
    meter.last = now;
    meter.peaks.fill(0);
    read?.(meter.peaks);
    surface.context.clearRect(0, 0, surface.width, surface.height);
    meter.channels.forEach((channel, column) => {
      stepMeter(channel, meter.peaks[column], dt);
      drawChannel(surface, channel, column);
    });
  });

  return (
    <canvas ref={canvas} role="img" aria-label={label} className={cn("block h-full w-5", className)} />
  );
}
