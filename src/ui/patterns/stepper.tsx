import { cn } from "@/lib/cn";
import { Led } from "@/ui/primitives/led";

/** Progress through a wizard: one lamp per step, lit up to the current one. */
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {steps.map((step, index) => (
        <li
          key={step}
          aria-current={index === current ? "step" : undefined}
          className="flex items-center gap-2"
        >
          <Led on={index <= current} pulse={index === current} />
          <span className={cn("silk", index === current && "text-ink")}>
            <span className="readout mr-1 tracking-normal">{index + 1}</span>
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}
