export interface Surface {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
}

/**
 * Sizes the canvas backing store to its CSS box at the device pixel ratio and
 * returns a context scaled so drawing code can work in CSS pixels.
 */
export function prepare(canvas: HTMLCanvasElement | null): Surface | null {
  if (!canvas) return null;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const targetWidth = Math.round(width * ratio);
  const targetHeight = Math.round(height * ratio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width, height };
}

/** Palette for canvas drawing. Mirrors the tokens in globals.css. */
export const INK = {
  well: "#070708",
  grid: "rgba(255, 255, 255, 0.055)",
  axis: "#8e8e98",
  trace: "#ef4444",
  traceGlow: "rgba(239, 68, 68, 0.55)",
  ledOff: "#2a0707",
  ledOn: "#dc2626",
  ledHigh: "#ff5c5c",
  ledPeak: "#ffd9d9",
  steel: "#dcdce0",
  steelDim: "#9a9aa3",
  soft: "#fca5a5",
} as const;
