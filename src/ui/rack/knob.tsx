"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/cn";

export interface KnobProps {
  /** -1 to 1. */
  value: number;
  onChange: (value: number) => void;
  label: string;
  valueText: string;
  className?: string;
}

const SWEEP_DEGREES = 135;
const DRAG_PIXELS = 120;
const KEY_STEP = 0.1;

const clamp = (value: number) => Math.max(-1, Math.min(1, value));
/** Snaps to dead centre when close, like the detent on a real pan pot. */
const settle = (value: number) => (Math.abs(value) < 0.04 ? 0 : Math.round(value * 100) / 100);

/**
 * Rotary control for a bipolar value. Drag up or down, use the arrow keys, or
 * double-click to return to centre.
 */
export function Knob({ value, onChange, label, valueText, className }: KnobProps) {
  const drag = useRef<{ y: number; value: number } | null>(null);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { y: event.clientY, value };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const moved = (drag.current.y - event.clientY) / DRAG_PIXELS;
    onChange(settle(clamp(drag.current.value + moved * 2)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowRight: KEY_STEP,
      ArrowUp: KEY_STEP,
      ArrowLeft: -KEY_STEP,
      ArrowDown: -KEY_STEP,
    };
    if (event.key === "Home") onChange(0);
    else if (steps[event.key]) onChange(settle(clamp(value + steps[event.key])));
    else return;
    event.preventDefault();
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={value}
      aria-valuetext={valueText}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => (drag.current = null)}
      onDoubleClick={() => onChange(0)}
      onKeyDown={onKeyDown}
      className={cn(
        "well relative size-10 shrink-0 cursor-ns-resize touch-none rounded-full border border-etch p-1",
        className,
      )}
    >
      <div
        className="brushed relative size-full rounded-full"
        style={{ transform: `rotate(${value * SWEEP_DEGREES}deg)` }}
      >
        <span className="absolute top-0.5 left-1/2 h-2.5 w-0.5 -translate-x-1/2 rounded-full bg-crimson-600" />
      </div>
    </div>
  );
}
