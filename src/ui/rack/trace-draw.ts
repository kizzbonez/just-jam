import { INK, type Surface } from "@/ui/rack/canvas";

export interface TraceSeries {
  key: string;
  label: string;
  /** Oldest first. The newest value is drawn at the right edge. */
  values: number[];
  stroke: string;
  width: number;
  dash: number[];
}

export interface TraceLayout {
  /** Fixed number of slots across the plot, so the time scale never shifts. */
  points: number;
  max: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const DIVISIONS = 4;
const STEPS = [8, 12, 20, 40, 60, 80, 120, 160, 200, 400];

/** Rounds the y-axis up to a tidy maximum that divides into four. */
export function niceMax(value: number): number {
  return STEPS.find((step) => step >= value) ?? Math.ceil(value / 100) * 100;
}

export function layoutFor(surface: Surface, points: number, max: number): TraceLayout {
  return { points, max, left: 34, right: surface.width - 8, top: 8, bottom: surface.height - 18 };
}

export const xAt = (layout: TraceLayout, slot: number) =>
  layout.left + (slot / (layout.points - 1)) * (layout.right - layout.left);

export const yAt = (layout: TraceLayout, value: number) =>
  layout.bottom - (Math.min(value, layout.max) / layout.max) * (layout.bottom - layout.top);

/** Recessive graticule with y values on the left and time marks along the bottom. */
export function drawAxes(surface: Surface, layout: TraceLayout, spanSeconds: number): void {
  const { context } = surface;
  context.font = '10px "JetBrains Mono Variable", ui-monospace, monospace';
  context.fillStyle = INK.axis;
  context.strokeStyle = INK.grid;
  context.lineWidth = 1;
  context.textBaseline = "middle";
  context.textAlign = "right";
  context.beginPath();
  for (let i = 0; i <= DIVISIONS; i++) {
    const value = (layout.max * i) / DIVISIONS;
    const y = Math.round(yAt(layout, value)) + 0.5;
    context.moveTo(layout.left, y);
    context.lineTo(layout.right, y);
    context.fillText(String(value), layout.left - 6, y);
  }
  context.stroke();
  context.textBaseline = "top";
  const marks: [number, string, CanvasTextAlign][] = [
    [0, `-${spanSeconds} s`, "left"],
    [0.5, `-${spanSeconds / 2} s`, "center"],
    [1, "now", "right"],
  ];
  for (const [fraction, text, align] of marks) {
    context.textAlign = align;
    context.fillText(text, layout.left + fraction * (layout.right - layout.left), layout.bottom + 5);
  }
}

export function drawSeries(surface: Surface, layout: TraceLayout, series: TraceSeries): void {
  const { context } = surface;
  const offset = layout.points - series.values.length;
  if (series.values.length < 2) return;
  context.beginPath();
  series.values.forEach((value, index) => {
    const x = xAt(layout, offset + index);
    const y = yAt(layout, value);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.strokeStyle = series.stroke;
  context.lineWidth = series.width;
  context.lineJoin = "round";
  context.setLineDash(series.dash);
  context.stroke();
  context.setLineDash([]);
}

/** Small flags along the baseline where an event (a dropout) happened. */
export function drawMarks(surface: Surface, layout: TraceLayout, marks: boolean[]): void {
  const { context } = surface;
  const offset = layout.points - marks.length;
  context.fillStyle = INK.ledPeak;
  marks.forEach((marked, index) => {
    if (marked) context.fillRect(xAt(layout, offset + index) - 1, layout.bottom - 7, 2, 7);
  });
}

export function drawCursor(surface: Surface, layout: TraceLayout, slot: number): void {
  const { context } = surface;
  const x = Math.round(xAt(layout, slot)) + 0.5;
  context.strokeStyle = INK.steelDim;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(x, layout.top);
  context.lineTo(x, layout.bottom);
  context.stroke();
}
