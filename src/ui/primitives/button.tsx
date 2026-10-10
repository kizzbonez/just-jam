import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/ui/primitives/spinner";

type Variant = "fire" | "steel" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  fire: "border-crimson-500/70 bg-linear-to-b from-crimson-500 to-crimson-700 text-white shadow-key hover:shadow-glow",
  steel:
    "border-etch-hi bg-linear-to-b from-carbon-800 to-carbon-900 text-ink shadow-key hover:border-steel-600",
  ghost: "border-transparent text-ink-soft hover:bg-carbon-800 hover:text-ink",
  danger:
    "border-crimson-700/60 bg-wine text-crimson-300 shadow-key hover:border-crimson-500 hover:text-white",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-[0.8125rem]",
  md: "h-10 gap-2 px-4 text-[0.9375rem]",
  lg: "h-12 gap-2.5 px-6 text-base",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/** A panel key: condensed caps legend, lit top edge, travels 1px when pressed. */
export function Button({
  variant = "steel",
  size = "md",
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[3px] border font-display font-semibold tracking-[0.09em] uppercase transition-[box-shadow,border-color,background-color,color,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}
