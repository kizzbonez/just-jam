import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Screw } from "@/ui/rack/screw";

export interface RackUnitProps {
  /** Silkscreen name printed top-left on the faceplate. */
  label: string;
  /** Small model code printed beside the name, e.g. "TL-IN". */
  code?: string;
  /** Right side of the header strip: status lamps, actions. */
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

function Ear({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "hidden w-7 shrink-0 flex-col items-center justify-between bg-black/25 py-3 sm:flex",
        side === "left" ? "border-r border-black/70" : "etch-l",
      )}
    >
      <Screw turn={side === "left" ? 28 : 112} />
      <Screw turn={side === "left" ? 140 : 64} />
    </div>
  );
}

/** One module in the rack: mounting ears, a legend strip and a faceplate body. */
export function RackUnit({ label, code, aside, className, bodyClassName, children }: RackUnitProps) {
  return (
    <section className={cn("plate flex overflow-hidden", className)}>
      <Ear side="left" />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="etch-b flex min-h-10 items-center justify-between gap-3 px-4 py-2">
          <h2 className="flex min-w-0 items-baseline gap-2.5">
            <span className="silk truncate text-ink-soft">{label}</span>
            {code && <span className="readout text-[0.625rem] text-steel-600">{code}</span>}
          </h2>
          {aside && <div className="flex shrink-0 items-center gap-3">{aside}</div>}
        </header>
        <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
      </div>
      <Ear side="right" />
    </section>
  );
}
