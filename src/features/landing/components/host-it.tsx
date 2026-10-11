import { Code2 } from "lucide-react";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { REPOSITORY } from "@/features/landing/constants";
import { KeyLink } from "@/ui/primitives/key-link";

const COMMANDS = `git clone ${REPOSITORY}.git
cd tonelink
npm run env:init
docker compose up -d --build`;

const POINTS = [
  "Three containers: the web app, a small Go relay and PostgreSQL.",
  "Every port is bound to your own machine until you decide otherwise.",
  "A one-time token in the server log is the only way to claim a new install.",
  "The relay forwards audio and stores nothing. It never decodes a packet.",
] as const;

/** Running your own studio. */
export function HostIt() {
  return (
    <section id="host" className="flex scroll-mt-20 flex-col gap-8">
      <SectionHeading
        n="05"
        eyebrow="Self-hosted"
        title="Your studio, on your machine"
        lead="ToneLink is open source and runs wherever Docker does. The closer the relay sits to the players, the lower the delay."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <pre className="well readout overflow-x-auto border border-etch p-5 text-sm leading-relaxed text-ink">
          {COMMANDS}
        </pre>
        <div className="flex flex-col justify-between gap-5">
          <ul className="flex flex-col gap-2.5">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 leading-relaxed text-ink-soft">
                <span aria-hidden className="mt-2.5 h-1 w-2.5 shrink-0 bg-crimson-600" />
                {point}
              </li>
            ))}
          </ul>
          <KeyLink
            href={REPOSITORY}
            className="self-start"
            icon={<Code2 aria-hidden className="size-4" />}
          >
            Source on GitHub
          </KeyLink>
        </div>
      </div>
    </section>
  );
}
