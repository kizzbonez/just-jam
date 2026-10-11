"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `draw` once per animation frame while `active`. The latest callback is
 * always used, so callers do not need to memoise it.
 */
export function useRaf(draw: () => void, active = true): void {
  const latest = useRef(draw);
  useEffect(() => {
    latest.current = draw;
  });

  useEffect(() => {
    if (!active) return;
    let frame = requestAnimationFrame(function tick() {
      latest.current();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
}
