"use client";

import { cn } from "@/lib/cn";

export interface FaderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  /** Spoken value, for example "-6 dB". */
  valueText?: string;
  vertical?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * A mixer fader: a native range input restyled as a slot with a brushed metal
 * cap, so keyboard and assistive technology behave as usual.
 */
export function Fader(props: FaderProps) {
  const { value, min = 0, max = 1, step = 0.01, onChange, label, valueText } = props;
  return (
    <input
      type="range"
      aria-label={label}
      aria-valuetext={valueText}
      aria-orientation={props.vertical ? "vertical" : "horizontal"}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={props.disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className={cn("fader", props.vertical && "fader-vertical", props.className)}
    />
  );
}
