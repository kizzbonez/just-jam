import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

/** Silkscreen label above a control, with a hint or an error beneath it. */
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="silk">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-crimson-300">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-label">{hint}</p>
      )}
    </div>
  );
}
