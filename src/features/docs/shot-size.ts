import shots from "@/features/docs/shots.json";

export interface ShotSize {
  width: number;
  height: number;
}

/** Pixel sizes of the screenshots, written by `npm run shots`. */
const SIZES: Record<string, ShotSize | undefined> = shots;
const FALLBACK: ShotSize = { width: 1440, height: 900 };

export const shotSize = (name: string): ShotSize => SIZES[name] ?? FALLBACK;
