import { cn } from "@/lib/cn";

/** Placeholder rows shown while a panel's data streams in. */
export function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <span
          key={index}
          className="well h-10 animate-pulse border border-etch"
          style={{ width: `${100 - index * 12}%` }}
        />
      ))}
    </div>
  );
}
