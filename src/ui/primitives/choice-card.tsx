import { cn } from "@/lib/cn";
import { Led } from "@/ui/primitives/led";

export interface ChoiceCardProps {
  name: string;
  value: string;
  title: string;
  description: string;
  checked: boolean;
  onSelect: (value: string) => void;
}

/** A radio option drawn as a selector key with an indicator lamp. */
export function ChoiceCard({ name, value, title, description, checked, onSelect }: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[3px] border bg-carbon-850 p-3.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-crimson-500",
        checked ? "border-crimson-600 shadow-glow-sm" : "border-etch hover:border-etch-hi",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <Led on={checked} className="mt-1.5" />
      <span className="flex flex-col gap-1">
        <span className="font-display text-base font-semibold tracking-wide text-ink uppercase">
          {title}
        </span>
        <span className="text-sm text-label">{description}</span>
      </span>
    </label>
  );
}
