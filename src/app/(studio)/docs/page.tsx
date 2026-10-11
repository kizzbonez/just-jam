import type { Metadata } from "next";
import Link from "next/link";
import { SignalPath } from "@/features/docs/components/signal-path";
import { GUIDE } from "@/features/docs/registry";

export const metadata: Metadata = { title: "Guide" };

export default function GuideIndexPage() {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="silk">Guide</p>
        <h1 className="font-display text-4xl leading-none font-bold tracking-[0.05em] text-ink uppercase sm:text-5xl">
          Play together, in time
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-ink-soft">
          Everything about running a room: setting up your interface, reading the telemetry,
          keeping accounts safe and hosting the studio yourself.
        </p>
      </header>
      <SignalPath />
      <ol className="grid gap-4 sm:grid-cols-2">
        {GUIDE.map((page, index) => (
          <li key={page.slug}>
            <Link
              href={`/docs/${page.slug}`}
              className="plate flex h-full flex-col gap-2 p-5 transition-colors hover:border-crimson-700"
            >
              <span className="readout text-sm text-crimson-500">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-xl font-semibold tracking-wide text-ink uppercase">
                {page.title}
              </span>
              <span className="text-sm leading-relaxed text-label">{page.summary}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
