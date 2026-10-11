import type { Metadata } from "next";
import { Suspense } from "react";
import { GuideArticle } from "@/features/docs/components/guide-article";
import { findGuidePage, GUIDE } from "@/features/docs/registry";
import { Skeleton } from "@/ui/patterns/skeleton";

/** Every guide page is known at build time, so all of them prerender. */
export function generateStaticParams() {
  return GUIDE.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps<"/docs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: findGuidePage(slug)?.title ?? "Guide" };
}

export default function GuidePageRoute({ params }: PageProps<"/docs/[slug]">) {
  return (
    <Suspense fallback={<Skeleton rows={6} />}>
      <GuideArticle params={params} />
    </Suspense>
  );
}
