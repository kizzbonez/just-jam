import { shotSize } from "@/features/docs/shot-size";
import { cn } from "@/lib/cn";

export interface LandingShotProps {
  /** File name under /landing, without the extension. */
  name: string;
  alt: string;
  /** Load at once instead of lazily, for the picture at the top of the page. */
  eager?: boolean;
  /** Crop to a fixed 16:10 window from the top-left, for use in a grid. */
  framed?: boolean;
  className?: string;
}

/** A product screenshot in a faceplate frame. These files are public. */
export function LandingShot({ name, alt, eager, framed, className }: LandingShotProps) {
  const { width, height } = shotSize(name);
  return (
    <div className={cn("plate overflow-hidden", framed && "aspect-[16/10]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/landing/${name}.png`}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={framed ? "size-full object-cover object-left-top" : "h-auto w-full"}
      />
    </div>
  );
}
