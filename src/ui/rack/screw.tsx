import { cn } from "@/lib/cn";

/** Slotted rack screw. The slot angle varies so a row never looks stamped. */
export function Screw({ turn = 35, className }: { turn?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative block size-2.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#6b6b74,#2b2b30_62%,#0c0c0e)] shadow-[0_1px_1px_rgba(255,255,255,0.07),inset_0_0_0_1px_rgba(0,0,0,0.6)]",
        className,
      )}
    >
      <span
        className="absolute top-1/2 left-1/2 h-px w-1.5 bg-black/80"
        style={{ transform: `translate(-50%, -50%) rotate(${turn}deg)` }}
      />
    </span>
  );
}
