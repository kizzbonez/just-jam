"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { INK, prepare } from "@/ui/rack/canvas";
import { useRaf } from "@/ui/rack/use-raf";

const POINTS = 512;

export interface WaveScopeProps {
  /** Fills `out` with the most recent waveform samples, -1 to 1. */
  read: ((out: Float32Array<ArrayBuffer>) => void) | null;
  label: string;
  className?: string;
}

/** Starts the sweep on a rising zero crossing so a steady tone stands still. */
function triggerIndex(samples: Float32Array, span: number): number {
  for (let i = 1; i < samples.length - span; i++) {
    if (samples[i - 1] < 0 && samples[i] >= 0) return i;
  }
  return 0;
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.strokeStyle = INK.grid;
  context.lineWidth = 1;
  context.beginPath();
  for (let column = 1; column < 8; column++) {
    const x = Math.round((width * column) / 8) + 0.5;
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }
  for (let row = 1; row < 4; row++) {
    const y = Math.round((height * row) / 4) + 0.5;
    context.moveTo(0, y);
    context.lineTo(width, y);
  }
  context.stroke();
}

/** Oscilloscope view of a live signal: one glowing trace over a faint graticule. */
export function WaveScope({ read, label, className }: WaveScopeProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const samples = useRef(new Float32Array(1024));

  useRaf(() => {
    const surface = prepare(canvas.current);
    if (!surface) return;
    const { context, width, height } = surface;
    const data = samples.current;
    data.fill(0);
    read?.(data);
    context.clearRect(0, 0, width, height);
    drawGrid(context, width, height);
    const start = triggerIndex(data, POINTS);
    context.beginPath();
    for (let i = 0; i < POINTS; i++) {
      const x = (i / (POINTS - 1)) * width;
      const y = height / 2 - data[start + i] * (height / 2 - 3);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = INK.trace;
    context.lineWidth = 1.6;
    context.shadowColor = INK.traceGlow;
    context.shadowBlur = 8;
    context.stroke();
    context.shadowBlur = 0;
  });

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={label}
      className={cn("well block h-24 w-full border border-etch", className)}
    />
  );
}
