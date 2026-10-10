import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "info" | "success";

const TONES: Record<Tone, { box: string; Icon: typeof Info }> = {
  error: { box: "border-crimson-700/60 bg-wine-deep text-crimson-300", Icon: CircleAlert },
  info: { box: "border-etch-hi bg-carbon-850 text-ink-soft", Icon: Info },
  success: { box: "border-etch-hi bg-carbon-850 text-ink", Icon: CircleCheck },
};

/** Inline status message. The icon and wording carry the meaning, not the color. */
export function Notice({
  tone = "info",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  const { box, Icon } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-2.5 rounded-[3px] border px-3 py-2.5 text-sm", box, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
