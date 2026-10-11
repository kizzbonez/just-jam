"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export interface GuideNavItem {
  slug: string;
  title: string;
}

/** Contents of the guide. A sidebar on wide screens, a scrolling strip on narrow ones. */
export function GuideNav({ items }: { items: GuideNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Guide" className="plate overflow-hidden lg:sticky lg:top-20">
      <p className="silk etch-b px-4 py-3 text-ink-soft">Guide</p>
      <ol className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
        {items.map((item, index) => {
          const active = pathname === `/docs/${item.slug}`;
          return (
            <li key={item.slug} className="shrink-0">
              <Link
                href={`/docs/${item.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-baseline gap-2.5 rounded-[3px] border px-3 py-2 text-sm whitespace-nowrap transition-colors",
                  active
                    ? "border-crimson-700 bg-wine text-ink"
                    : "border-transparent text-label hover:bg-carbon-800 hover:text-ink",
                )}
              >
                <span className="readout text-xs">{String(index + 1).padStart(2, "0")}</span>
                {item.title}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
