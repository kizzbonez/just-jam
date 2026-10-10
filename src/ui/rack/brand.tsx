import { cn } from "@/lib/cn";
import { Badge } from "@/ui/primitives/badge";

/** The ToneLink badge plate: two stacked signal bars beside the wordmark. */
export function Brand({ size = "md", className }: { size?: "md" | "lg"; className?: string }) {
  const large = size === "lg";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span aria-hidden className={cn("flex flex-col gap-0.75", large ? "w-5" : "w-4")}>
        <span className="h-1 rounded-[1px] bg-crimson-500 shadow-glow-sm" />
        <span className="h-1 w-3/5 rounded-[1px] bg-crimson-600" />
        <span className="h-1 w-4/5 rounded-[1px] bg-crimson-700" />
      </span>
      <span
        className={cn(
          "font-display leading-none font-bold tracking-[0.14em] text-ink uppercase",
          large ? "text-3xl" : "text-xl",
        )}
      >
        Tone<span className="text-crimson-500">Link</span>
      </span>
      <Badge tone="wine">QUIC</Badge>
    </span>
  );
}
