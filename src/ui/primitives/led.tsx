import { cn } from "@/lib/cn";

export interface LedProps {
  on?: boolean;
  /** Slow blink, for "in progress" states. */
  pulse?: boolean;
  className?: string;
}

/** Panel indicator lamp. Decorative: pair it with a text label for meaning. */
export function Led({ on = false, pulse = false, className }: LedProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 shrink-0 rounded-full ring-1 ring-black/70",
        on
          ? "bg-crimson-500 shadow-[0_0_8px_1px_rgba(239,68,68,0.75),inset_0_-1px_1px_rgba(0,0,0,0.35)]"
          : "bg-wine-deep shadow-[inset_0_1px_1px_rgba(0,0,0,0.7)]",
        on && pulse && "animate-led",
        className,
      )}
    />
  );
}
