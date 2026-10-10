"use client";

import { AudioLines, BookOpen, History } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/lobby", label: "Lobby", Icon: AudioLines },
  { href: "/history", label: "History", Icon: History },
  { href: "/docs", label: "Guide", Icon: BookOpen },
] as const;

/** Primary navigation. The active section gets a lit underline. */
export function StudioNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex items-stretch gap-1">
      {ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2 px-3 font-display text-[0.9375rem] font-semibold tracking-[0.1em] uppercase transition-colors",
              active ? "text-ink" : "text-label hover:text-ink",
            )}
          >
            <Icon aria-hidden className="size-4" />
            <span className="hidden sm:inline">{label}</span>
            {active && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 bg-crimson-500 shadow-glow-sm" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
