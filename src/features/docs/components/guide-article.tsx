import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { findGuidePage, GUIDE, neighbours, type GuidePage } from "@/features/docs/registry";

function PagerLink({ page, direction }: { page: GuidePage; direction: "previous" | "next" }) {
  const next = direction === "next";
  return (
    <Link
      href={`/docs/${page.slug}`}
      className={`plate flex flex-1 flex-col gap-1.5 p-4 transition-colors hover:border-crimson-700 ${next ? "items-end text-right" : ""}`}
    >
      <span className="silk flex items-center gap-2">
        {!next && <ArrowLeft aria-hidden className="size-3.5" />}
        {next ? "Next" : "Previous"}
        {next && <ArrowRight aria-hidden className="size-3.5" />}
      </span>
      <span className="font-display text-lg font-semibold tracking-wide text-ink uppercase">
        {page.title}
      </span>
    </Link>
  );
}

/** One page of the guide: heading, body and links to the pages either side. */
export async function GuideArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = findGuidePage(slug);
  if (!page) notFound();
  const { previous, next } = neighbours(slug);
  const number = String(GUIDE.indexOf(page) + 1).padStart(2, "0");
  return (
    <article className="flex min-w-0 flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="silk">
          Guide <span className="readout ml-1 text-crimson-500">{number}</span>
        </p>
        <h1 className="font-display text-4xl leading-none font-bold tracking-[0.05em] text-ink uppercase sm:text-5xl">
          {page.title}
        </h1>
      </header>
      <page.Body />
      <footer className="etch-t flex flex-col gap-3 pt-6 sm:flex-row">
        {previous ? <PagerLink page={previous} direction="previous" /> : <span className="flex-1" />}
        {next ? <PagerLink page={next} direction="next" /> : <span className="flex-1" />}
      </footer>
    </article>
  );
}
