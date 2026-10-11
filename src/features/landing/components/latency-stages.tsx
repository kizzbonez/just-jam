import { SectionHeading } from "@/features/landing/components/section-heading";
import { cn } from "@/lib/cn";
import { Badge } from "@/ui/primitives/badge";

const STAGES = [
  { name: "Capture", range: "3 to 10 ms", owner: "Their interface", yours: false },
  { name: "Framing", range: "1 to 12 ms", owner: "You choose", yours: true },
  { name: "Network", range: "distance", owner: "Physics", yours: false },
  { name: "Buffer", range: "5 to 40 ms", owner: "Tuned for you", yours: true },
  { name: "Output", range: "3 to 40 ms", owner: "Your interface", yours: false },
] as const;

/** The five delays that add up to latency, and which of them the studio controls. */
export function LatencyStages() {
  return (
    <section id="latency" className="flex scroll-mt-20 flex-col gap-8">
      <SectionHeading
        n="04"
        eyebrow="Latency"
        title="Five delays. Two are yours to set."
        lead="Players stay comfortably in time up to about 25 to 30 ms, the delay of standing nine metres apart on a stage. ToneLink shows each part of the total, so you know which one to work on."
      />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((stage, index) => (
          <li
            key={stage.name}
            className={cn(
              "flex flex-col gap-3 rounded-[3px] border p-4",
              stage.yours ? "border-crimson-600 bg-wine-deep shadow-glow-sm" : "well border-etch",
            )}
          >
            <span className="readout text-xs text-steel-600">{String(index + 1).padStart(2, "0")}</span>
            <span className="font-display text-2xl leading-none font-semibold tracking-wide text-ink uppercase">
              {stage.name}
            </span>
            <span className="readout text-sm text-ink-soft">{stage.range}</span>
            <Badge tone={stage.yours ? "live" : "steel"} className="self-start">
              {stage.owner}
            </Badge>
          </li>
        ))}
      </ol>
      <p className="max-w-3xl text-sm leading-relaxed text-label">
        Ranges are typical, not promises. Capture and output depend on each player&apos;s hardware
        and driver, and the network part is distance. The telemetry rack reports the real figures
        for your own session.
      </p>
    </section>
  );
}
