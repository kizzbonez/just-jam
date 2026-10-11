import Link from "next/link";
import { KeyLink } from "@/ui/primitives/key-link";
import { Brand } from "@/ui/rack/brand";

const ANCHORS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#latency", label: "Latency" },
  { href: "#host", label: "Host it" },
] as const;

/** The strip across the top of the public home page. */
export function LandingHeader() {
  return (
    <header className="plate sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="ToneLink QUIC home" className="flex items-center">
          <Brand />
        </Link>
        <nav aria-label="On this page" className="hidden items-center gap-1 md:flex">
          {ANCHORS.map((anchor) => (
            <a
              key={anchor.href}
              href={anchor.href}
              className="px-3 py-2 font-display text-[0.9375rem] font-semibold tracking-[0.1em] text-label uppercase transition-colors hover:text-ink"
            >
              {anchor.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <KeyLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
            Sign in
          </KeyLink>
          <KeyLink href="/lobby" variant="fire" size="sm">
            Open studio
          </KeyLink>
        </div>
      </div>
    </header>
  );
}
