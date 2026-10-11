import { shotSize } from "@/features/docs/shot-size";

export interface FigureProps {
  /** File name under /guide, without the extension. */
  shot: string;
  alt: string;
  caption: string;
}

/**
 * A screenshot plate. Plain img on purpose: the files live behind sign-in and
 * must not be reachable through the image optimizer.
 */
export function Figure({ shot, alt, caption }: FigureProps) {
  const { width, height } = shotSize(shot);
  return (
    <figure className="plate flex max-w-full flex-col self-start overflow-hidden" style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/guide/${shot}.png`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className="h-auto w-full"
      />
      <figcaption className="etch-t flex items-baseline gap-3 px-4 py-3">
        <span className="silk shrink-0 text-crimson-500">Fig.</span>
        <span className="text-sm text-label">{caption}</span>
      </figcaption>
    </figure>
  );
}
