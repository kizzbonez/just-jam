import { SignalPath } from "@/features/docs/components/signal-path";
import { LandingShot } from "@/features/landing/components/landing-shot";
import { SectionHeading } from "@/features/landing/components/section-heading";

/** The path a note takes, with the real console underneath it. */
export function HowItWorks() {
  return (
    <section id="how" className="flex scroll-mt-20 flex-col gap-8">
      <SectionHeading
        n="02"
        eyebrow="How it works"
        title="One short path from string to ear"
        lead="Your interface is read raw, cut into short frames and sent as datagrams. On the other side each player has a small buffer of their own, sized from how unevenly their packets really arrive."
      />
      <SignalPath />
      <LandingShot
        name="console"
        alt="The studio console during a session: interface rack, mixer with two players, transport, jitter buffer and telemetry"
        eager
      />
    </section>
  );
}
