import { ArrowDown, ArrowRight } from "lucide-react";
import { Fragment } from "react";
import { cn } from "@/lib/cn";

interface Stage {
  name: string;
  where: string;
  detail: string;
  /** The hop that crosses the network. */
  network?: boolean;
}

const STAGES: Stage[] = [
  { name: "Interface", where: "Your hardware", detail: "48 kHz, no echo cancel, no gain control" },
  { name: "Capture", where: "AudioWorklet", detail: "Routes channels, cuts 2.5 to 20 ms frames" },
  { name: "Encode", where: "Worker · WebCodecs", detail: "Opus low-delay or raw PCM" },
  { name: "Relay", where: "QUIC datagrams", detail: "Forwarded, never decoded", network: true },
  { name: "Decode", where: "Worker · WebCodecs", detail: "Orders packets, measures arrival" },
  { name: "Jitter buffer", where: "AudioWorklet", detail: "Adaptive, drift corrected" },
  { name: "Mixer", where: "Web Audio", detail: "Your volume, pan and mute" },
];

/**
 * The route one note takes from a player's interface to another player's
 * ears. Read left to right on a wide screen, top to bottom on a narrow one.
 */
export function SignalPath() {
  return (
    <figure className="plate flex flex-col gap-4 p-4 sm:p-5">
      <ol className="flex flex-col items-stretch gap-2 xl:flex-row">
        {STAGES.map((stage, index) => (
          <Fragment key={stage.name}>
            {index > 0 && (
              <li aria-hidden className="flex items-center justify-center text-steel-600">
                <ArrowRight className="hidden size-4 xl:block" />
                <ArrowDown className="size-4 xl:hidden" />
              </li>
            )}
            <li
              className={cn(
                "flex flex-1 flex-col gap-1.5 rounded-[3px] border p-3",
                stage.network ? "border-crimson-600 bg-wine-deep shadow-glow-sm" : "well border-etch",
              )}
            >
              <span className="font-display text-base leading-none font-semibold tracking-wide text-ink uppercase">
                {stage.name}
              </span>
              <span className="silk text-[0.625rem]">{stage.where}</span>
              <span className="text-xs leading-snug text-label">{stage.detail}</span>
            </li>
          </Fragment>
        ))}
      </ol>
      <figcaption className="text-sm text-label">
        The highlighted hop is the only one that leaves your computer. Nothing on the page&apos;s
        main thread is in this path, so the interface can redraw without touching the audio.
      </figcaption>
    </figure>
  );
}
