"use client";

import { useEffect, useRef } from "react";
import type { AudioProfile } from "@/features/studio/audio-profile";
import { api } from "@/lib/api-client";

const DEBOUNCE_MS = 900;

/**
 * Saves the audio settings shortly after they stop changing, so the next room
 * starts the way this one was left. A failed save is not worth interrupting a
 * session for, so it is dropped silently.
 */
export function useProfileSync(profile: AudioProfile): void {
  const saved = useRef(JSON.stringify(profile));

  useEffect(() => {
    const next = JSON.stringify(profile);
    if (next === saved.current) return;
    const timer = setTimeout(() => {
      saved.current = next;
      api("/api/profile/audio", { method: "PUT", body: profile }).catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [profile]);
}
