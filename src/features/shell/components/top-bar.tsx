import Link from "next/link";
import { Suspense } from "react";
import { StudioNav } from "@/features/shell/components/studio-nav";
import { UserChip } from "@/features/shell/components/user-chip";
import { Brand } from "@/ui/rack/brand";

/** The master strip across the top of every studio page. */
export function TopBar() {
  return (
    <header className="plate sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-stretch justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-stretch gap-6">
          <Link href="/lobby" aria-label="ToneLink lobby" className="flex items-center">
            <Brand />
          </Link>
          <Suspense>
            <StudioNav />
          </Suspense>
        </div>
        <div className="flex items-center">
          <Suspense fallback={<span className="well h-8 w-28 animate-pulse border border-etch" />}>
            <UserChip />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
