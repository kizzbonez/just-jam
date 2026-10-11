import { ArrowRight, UserPlus } from "lucide-react";
import { HeroRig } from "@/features/landing/components/hero-rig";
import { KeyLink } from "@/ui/primitives/key-link";

/** The opening statement, the two ways in, and a moving model of the signal. */
export function Hero() {
  return (
    <section className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14 lg:py-20">
      <div className="flex flex-col gap-6">
        <p className="silk">Browser jamming studio</p>
        <h1 className="font-display text-6xl leading-[0.88] font-bold tracking-[0.02em] text-ink uppercase sm:text-7xl xl:text-8xl">
          Play together.
          <br />
          <span className="text-crimson-500 [text-shadow:0_0_28px_rgba(239,68,68,0.35)]">
            In time.
          </span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
          ToneLink sends the sound of your audio interface straight to your band: no echo
          cancelling, no noise gate, no hidden buffer. Short frames, one datagram each, browser to browser, and
          every millisecond of delay shown on the panel.
        </p>
        <div className="flex flex-wrap gap-3">
          <KeyLink
            href="/lobby"
            variant="fire"
            size="lg"
            icon={<ArrowRight aria-hidden className="size-4.5" />}
          >
            Open the studio
          </KeyLink>
          <KeyLink
            href="/register"
            size="lg"
            icon={<UserPlus aria-hidden className="size-4.5" />}
          >
            Create account
          </KeyLink>
        </div>
        <p className="silk leading-relaxed">Chrome or Edge · Headphones · Any audio interface</p>
      </div>
      <HeroRig />
    </section>
  );
}
