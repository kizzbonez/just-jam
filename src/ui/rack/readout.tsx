import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ReadoutProps {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Marks a value that needs attention. Always paired with `note` text. */
  alert?: boolean;
  note?: string;
  className?: string;
}

/** A telemetry counter: silkscreen legend over a recessed monospace window. */
export function Readout({ label, value, unit, alert, note, className }: ReadoutProps) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="silk">{label}</span>
      <div
        className={cn(
          "well flex h-9 items-baseline justify-end gap-1 border border-etch px-2.5 pt-2",
          alert && "border-crimson-700 shadow-glow-sm",
        )}
      >
        <span className="readout truncate text-base leading-none text-ink">{value}</span>
        {unit && <span className="readout text-[0.625rem] text-label">{unit}</span>}
      </div>
      {note && (
        <span className={cn("text-xs", alert ? "text-crimson-300" : "text-label")}>{note}</span>
      )}
    </div>
  );
}
