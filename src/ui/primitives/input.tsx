import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  /** Monospace face, for codes, tokens and numeric entry. */
  mono?: boolean;
}

export const CONTROL_CLASS =
  "well h-10 w-full border border-etch px-3 text-[0.9375rem] text-ink placeholder:text-steel-600 transition-[border-color,box-shadow] duration-150 focus:border-crimson-500 focus:shadow-glow-sm focus:outline-none disabled:opacity-50";

export function Input({ invalid, mono, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_CLASS,
        mono && "readout tracking-wider",
        invalid && "border-crimson-600",
        className,
      )}
      {...rest}
    />
  );
}
