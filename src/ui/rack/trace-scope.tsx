"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { prepare } from "@/ui/rack/canvas";
import {
  drawAxes,
  drawCursor,
  drawMarks,
  drawSeries,
  layoutFor,
  niceMax,
  type TraceSeries,
} from "@/ui/rack/trace-draw";

export interface TraceScopeProps {
  series: TraceSeries[];
  /** Per-slot event flags, drawn as ticks on the baseline. */
  marks: boolean[];
  marksLabel: string;
  unit: string;
  /** Total slots across the plot and the time each one covers. */
  points: number;
  stepSeconds: number;
  label: string;
}

function Legend({ series, marksLabel }: Pick<TraceScopeProps, "series" | "marksLabel">) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {series.map((item) => (
        <li key={item.key} className="silk flex items-center gap-2">
          <svg aria-hidden width="22" height="6">
            <line
              x1="0"
              y1="3"
              x2="22"
              y2="3"
              stroke={item.stroke}
              strokeWidth={item.width}
              strokeDasharray={item.dash.join(" ")}
            />
          </svg>
          {item.label}
        </li>
      ))}
      <li className="silk flex items-center gap-2">
        <span aria-hidden className="h-2 w-0.5 bg-hot" />
        {marksLabel}
      </li>
    </ul>
  );
}

/**
 * Rolling telemetry plot: several series on one shared axis, newest at the
 * right. Hovering shows the exact values at that moment.
 */
export function TraceScope(props: TraceScopeProps) {
  const { series, marks, unit, points, stepSeconds, label } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const peak = Math.max(1, ...series.flatMap((item) => item.values));
  const max = niceMax(peak * 1.15);

  useEffect(() => {
    const surface = prepare(canvas.current);
    if (!surface) return;
    const layout = layoutFor(surface, points, max);
    surface.context.clearRect(0, 0, surface.width, surface.height);
    drawAxes(surface, layout, Math.round(points * stepSeconds));
    drawMarks(surface, layout, marks);
    series.forEach((item) => drawSeries(surface, layout, item));
    if (hover !== null) drawCursor(surface, layout, hover);
  });

  function onMove(event: PointerEvent<HTMLCanvasElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - box.left - 34) / (box.width - 42);
    setHover(Math.max(0, Math.min(points - 1, Math.round(fraction * (points - 1)))));
  }

  const ago = hover === null ? 0 : (points - 1 - hover) * stepSeconds;
  return (
    <div className="flex flex-col gap-2">
      <Legend series={series} marksLabel={props.marksLabel} />
      <div className="relative">
        <canvas
          ref={canvas}
          role="img"
          aria-label={label}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="well block h-44 w-full cursor-crosshair border border-etch"
        />
        {hover !== null && (
          <div className="glass pointer-events-none absolute top-2 right-2 rounded-[3px] px-2.5 py-2">
            <p className="silk mb-1">{ago === 0 ? "Now" : `${ago.toFixed(1)} s ago`}</p>
            {series.map((item) => {
              const value = item.values[hover - (points - item.values.length)];
              return (
                <p key={item.key} className="readout flex justify-between gap-4 text-xs text-ink">
                  <span className="text-label">{item.label}</span>
                  <span>{value === undefined ? "--" : `${value.toFixed(1)} ${unit}`}</span>
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
