export interface SectionHeadingProps {
  n: string;
  eyebrow: string;
  title: string;
  lead?: string;
}

/** The numbered heading that opens each section of the home page. */
export function SectionHeading({ n, eyebrow, title, lead }: SectionHeadingProps) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <p className="silk flex items-center gap-3">
        <span className="readout text-sm tracking-normal text-crimson-500">{n}</span>
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl leading-[0.95] font-bold tracking-[0.03em] text-ink uppercase sm:text-5xl">
        {title}
      </h2>
      {lead && <p className="text-lg leading-relaxed text-ink-soft">{lead}</p>}
    </div>
  );
}
