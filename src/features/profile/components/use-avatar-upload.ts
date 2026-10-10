"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { resizeToAvatar } from "@/features/profile/components/resize-image";

const FALLBACK = "Could not update the picture.";

async function send(method: "PUT" | "DELETE", body?: Blob): Promise<void> {
  const response = await fetch("/api/profile/avatar", { method, body });
  if (response.ok) return;
  const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  throw new Error(data.error?.message ?? FALLBACK);
}

/** Upload and removal of the profile picture, with busy and error state. */
export function useAvatarUpload() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (task: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await task();
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : FALLBACK);
      } finally {
        setBusy(false);
      }
    },
    [router],
  );

  const upload = useCallback(
    (file: File) => run(async () => send("PUT", await resizeToAvatar(file))),
    [run],
  );
  const remove = useCallback(() => run(() => send("DELETE")), [run]);

  return { busy, error, upload, remove };
}
