import { Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Children = { children: ReactNode };

/** Opening paragraph of a guide page. */
export function Lead({ children }: Children) {
  return <p className="max-w-3xl text-lg leading-relaxed text-ink-soft">{children}</p>;
}

/** A numbered section. The number is printed like a panel legend. */
export function Section({ id, n, title, children }: Children & { id: string; n: string; title: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-24 flex-col gap-4">
      <h2 id={`${id}-title`} className="etch-b flex items-baseline gap-3 pb-2.5">
        <span className="readout text-sm text-crimson-500">{n}</span>
        <span className="font-display text-2xl font-semibold tracking-[0.06em] text-ink uppercase">
          {title}
        </span>
      </h2>
      {children}
    </section>
  );
}

export function P({ children }: Children) {
  return <p className="max-w-3xl leading-relaxed text-ink-soft">{children}</p>;
}

export function Strong({ children }: Children) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

export function Code({ children }: Children) {
  return (
    <code className="readout rounded-[2px] border border-etch bg-well px-1.5 py-0.5 text-[0.8125rem] text-ink">
      {children}
    </code>
  );
}

export function Pre({ children }: { children: string }) {
  return (
    <pre className="well readout max-w-3xl overflow-x-auto border border-etch p-4 text-[0.8125rem] leading-relaxed text-ink">
      {children}
    </pre>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex max-w-3xl flex-col gap-2 text-ink-soft">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 leading-relaxed">
          <span aria-hidden className="mt-2.5 h-1 w-2.5 shrink-0 bg-crimson-600" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Ordered procedure. Each step gets a numbered key cap. */
export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex max-w-3xl flex-col gap-3">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3.5 leading-relaxed text-ink-soft">
          <span className="readout well flex size-7 shrink-0 items-center justify-center border border-etch text-sm text-ink">
            {index + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

/** A note set apart from the text. The icon and heading say what kind. */
export function Callout({ tone = "note", title, children }: Children & { tone?: "note" | "warn"; title: string }) {
  const Icon = tone === "warn" ? TriangleAlert : Info;
  return (
    <aside
      className={cn(
        "flex max-w-3xl gap-3 rounded-[3px] border p-4",
        tone === "warn" ? "border-crimson-700/60 bg-wine-deep" : "border-etch-hi bg-carbon-850",
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4.5 shrink-0", tone === "warn" ? "text-crimson-300" : "text-label")} />
      <div className="flex flex-col gap-1.5">
        <p className="font-display text-base font-semibold tracking-wide text-ink uppercase">{title}</p>
        <div className="leading-relaxed text-ink-soft">{children}</div>
      </div>
    </aside>
  );
}

export interface SpecRow {
  name: ReactNode;
  value: ReactNode;
  note?: ReactNode;
}

/** A reference table: settings, variables, ports. Scrolls sideways on narrow screens. */
export function Spec({ head, rows }: { head: [string, string, string]; rows: SpecRow[] }) {
  return (
    <div className="well max-w-full overflow-x-auto border border-etch">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className="silk border-b border-etch px-4 py-3">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-etch/60 last:border-0">
              <th scope="row" className="readout px-4 py-3 align-top font-normal whitespace-nowrap text-ink">
                {row.name}
              </th>
              <td className="readout px-4 py-3 align-top text-ink-soft">{row.value}</td>
              <td className="px-4 py-3 align-top leading-relaxed text-label">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
