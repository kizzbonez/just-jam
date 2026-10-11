import { Suspense, type ReactNode } from "react";
import { GuideNav } from "@/features/docs/components/guide-nav";
import { GUIDE } from "@/features/docs/registry";

const ITEMS = GUIDE.map(({ slug, title }) => ({ slug, title }));

export default function GuideLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <Suspense>
        <GuideNav items={ITEMS} />
      </Suspense>
      {children}
    </div>
  );
}
