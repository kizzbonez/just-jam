"use client";

import { Check, Link2, LogIn, Power } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";

export interface RoomActionsProps {
  slug: string;
  name: string;
  isHost: boolean;
}

/** Per-room keys: copy the invite link, close the room (host), enter. */
export function RoomActions({ slug, name, isHost }: RoomActionsProps) {
  const router = useRouter();
  const action = useApiAction();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function close() {
    if (!window.confirm(`Close "${name}" for everyone? This cannot be undone.`)) return;
    const done = await action.run(() => api(`/api/rooms/${slug}`, { method: "DELETE" }));
    if (done) router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={copyLink}
        aria-label={`Copy invite link for ${name}`}
        icon={
          copied ? <Check aria-hidden className="size-4" /> : <Link2 aria-hidden className="size-4" />
        }
      >
        <span className="hidden md:inline">{copied ? "Copied" : "Link"}</span>
      </Button>
      {isHost && (
        <Button
          size="sm"
          variant="danger"
          loading={action.pending}
          onClick={close}
          aria-label={`Close ${name}`}
          icon={<Power aria-hidden className="size-4" />}
        >
          <span className="hidden md:inline">Close</span>
        </Button>
      )}
      <Link
        href={`/room/${slug}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-[3px] border border-crimson-500/70 bg-linear-to-b from-crimson-500 to-crimson-700 px-3 font-display text-[0.8125rem] font-semibold tracking-[0.09em] text-white uppercase shadow-key transition-shadow hover:shadow-glow"
      >
        <LogIn aria-hidden className="size-4" /> Enter
      </Link>
    </div>
  );
}
