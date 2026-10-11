import { ArrowRight } from "lucide-react";
import { REPOSITORY } from "@/features/landing/constants";
import { KeyLink } from "@/ui/primitives/key-link";
import { Brand } from "@/ui/rack/brand";

/** The last call to action and the footer. */
export function Closing() {
  return (
    <>
      <section className="plate flex flex-col items-center gap-6 px-6 py-14 text-center sm:py-20">
        <h2 className="font-display text-5xl leading-[0.92] font-bold tracking-[0.03em] text-ink uppercase sm:text-6xl">
          Open a room. Send the link.
          <br />
          <span className="text-crimson-500">Play.</span>
        </h2>
        <p className="max-w-xl text-lg leading-relaxed text-ink-soft">
          It takes a minute to create an account and one click to open your first room.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <KeyLink
            href="/lobby"
            variant="fire"
            size="lg"
            icon={<ArrowRight aria-hidden className="size-4.5" />}
          >
            Open the studio
          </KeyLink>
          <KeyLink href="/register" size="lg">
            Create account
          </KeyLink>
        </div>
      </section>
      <footer className="etch-t flex flex-wrap items-center justify-between gap-4 py-8">
        <Brand />
        <p className="silk leading-relaxed">WebTransport · WebCodecs · AudioWorklet</p>
        <a
          href={REPOSITORY}
          target="_blank"
          rel="noreferrer"
          className="silk text-ink underline-offset-4 hover:underline"
        >
          GitHub
        </a>
      </footer>
    </>
  );
}
