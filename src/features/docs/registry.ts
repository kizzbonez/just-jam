import type { ComponentType } from "react";
import { AudioSetup } from "@/features/docs/pages/audio-setup";
import { GettingStarted } from "@/features/docs/pages/getting-started";
import { Latency } from "@/features/docs/pages/latency";
import { Rooms } from "@/features/docs/pages/rooms";
import { Security } from "@/features/docs/pages/security";
import { SelfHosting } from "@/features/docs/pages/self-hosting";
import { Troubleshooting } from "@/features/docs/pages/troubleshooting";

export interface GuidePage {
  slug: string;
  title: string;
  summary: string;
  Body: ComponentType;
}

/** The guide, in reading order. */
export const GUIDE: GuidePage[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "What ToneLink does, what you need and your first room in five steps.",
    Body: GettingStarted,
  },
  {
    slug: "audio-setup",
    title: "Audio setup",
    summary: "Choosing an interface, routing its inputs, monitoring and setting your level.",
    Body: AudioSetup,
  },
  {
    slug: "rooms",
    title: "Rooms",
    summary: "Creating, sharing and joining rooms, PINs and what the host can do.",
    Body: Rooms,
  },
  {
    slug: "latency",
    title: "Latency and buffering",
    summary: "Where delay comes from, codecs and frame sizes, the jitter buffer and telemetry.",
    Body: Latency,
  },
  {
    slug: "security",
    title: "Account security",
    summary: "Two-factor sign-in, recovery codes, devices and what to do when one is lost.",
    Body: Security,
  },
  {
    slug: "self-hosting",
    title: "Self-hosting",
    summary: "Running the stack, configuration, and reaching players outside your network.",
    Body: SelfHosting,
  },
  {
    slug: "troubleshooting",
    title: "Troubleshooting",
    summary: "Messages and readings you may see, what they mean and what to do.",
    Body: Troubleshooting,
  },
];

export const findGuidePage = (slug: string) => GUIDE.find((page) => page.slug === slug);

/** The pages before and after one, for the footer links. */
export function neighbours(slug: string): { previous?: GuidePage; next?: GuidePage } {
  const index = GUIDE.findIndex((page) => page.slug === slug);
  return { previous: GUIDE[index - 1], next: GUIDE[index + 1] };
}
