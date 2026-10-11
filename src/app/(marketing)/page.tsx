import type { Metadata } from "next";
import { Closing } from "@/features/landing/components/closing";
import { Comparison } from "@/features/landing/components/comparison";
import { FactStrip } from "@/features/landing/components/fact-strip";
import { FeatureGrid } from "@/features/landing/components/feature-grid";
import { Hero } from "@/features/landing/components/hero";
import { HostIt } from "@/features/landing/components/host-it";
import { HowItWorks } from "@/features/landing/components/how-it-works";
import { LandingHeader } from "@/features/landing/components/landing-header";
import { LatencyStages } from "@/features/landing/components/latency-stages";

const DESCRIPTION =
  "A browser jamming studio. Raw interface audio, encoded with WebCodecs and sent as QUIC datagrams over WebTransport, with every millisecond of delay on the panel.";

export const metadata: Metadata = {
  title: { absolute: "ToneLink QUIC: play together, in time" },
  description: DESCRIPTION,
  // The home page is the one page meant to be found.
  robots: { index: true, follow: true },
  openGraph: { title: "ToneLink QUIC: play together, in time", description: DESCRIPTION },
};

export default function HomePage() {
  return (
    <>
      <LandingHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-20 px-4 pb-10 sm:px-6 lg:gap-28">
        <div className="flex flex-col gap-10">
          <Hero />
          <FactStrip />
        </div>
        <Comparison />
        <HowItWorks />
        <FeatureGrid />
        <LatencyStages />
        <HostIt />
        <Closing />
      </main>
    </>
  );
}
