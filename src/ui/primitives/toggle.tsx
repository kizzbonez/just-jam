"use client";

import { cn } from "@/lib/cn";

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  /** Hide the text and keep it only for assistive tech. */
  compact?: boolean;
}

/** Metal lever switch in a recessed slot; the slot lights red when on. */
export function Toggle({ checked, onChange, label, disabled, compact }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={compact ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2.5 disabled:opacity-45"
    >
      <span
        className={cn(
          "well relative h-5.5 w-11 shrink-0 border border-etch transition-colors duration-200",
          checked && "border-crimson-700 bg-wine shadow-glow-sm",
        )}
      >
        <span
          className={cn(
            "brushed absolute top-1/2 left-0.5 h-4 w-5 -translate-y-1/2 rounded-[2px] transition-transform duration-200 ease-out",
            checked && "translate-x-5",
          )}
        />
      </span>
      {!compact && (
        <span className={cn("silk transition-colors", checked && "text-ink")}>{label}</span>
      )}
    </button>
  );
}
