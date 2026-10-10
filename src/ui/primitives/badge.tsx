import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "wine" | "steel" | "live";

const TONES: Record<Tone, string> = {
  wine: "border-crimson-700/45 bg-wine text-crimson-300",
  steel: "border-etch-hi bg-carbon-800 text-ink-soft",
  live: "border-crimson-500/70 bg-crimson-600 text-white shadow-glow-sm",
};

export function Badge({
  tone = "wine",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-[2px] border px-1.5 font-display text-[0.6875rem] leading-none font-semibold tracking-[0.13em] whitespace-nowrap uppercase",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
