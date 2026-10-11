"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/ui/primitives/button";
import { RackUnit } from "@/ui/rack/rack-unit";

export interface ClosedPanelProps {
  reason: string;
  /** Null when entering again could only fail, for example after being removed. */
  onRejoin: (() => void) | null;
}

/** Shown when the session to the relay has ended, with the reason in plain words. */
export function ClosedPanel({ reason, onRejoin }: ClosedPanelProps) {
  return (
    <RackUnit label="Session ended" code="TL-OFF" className="mx-auto max-w-xl" bodyClassName="p-6">
      <div className="flex flex-col gap-5">
        <p role="status" className="text-[0.9375rem] text-ink">
          {reason}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {onRejoin && (
            <Button
              variant="fire"
              onClick={onRejoin}
              icon={<RotateCcw aria-hidden className="size-4" />}
            >
              Rejoin
            </Button>
          )}
          <Link href="/lobby" className="silk text-ink underline-offset-4 hover:underline">
            Back to the lobby
          </Link>
        </div>
      </div>
    </RackUnit>
  );
}
