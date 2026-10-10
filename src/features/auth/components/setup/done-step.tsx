"use client";

import { ArrowRight } from "lucide-react";
import { enterStudio } from "@/features/auth/navigation";
import type { SetupResult } from "@/features/auth/server/setup";
import { CopyField } from "@/ui/patterns/copy-field";
import { RecoveryCodes } from "@/ui/patterns/recovery-codes";
import { Button } from "@/ui/primitives/button";

export function DoneStep({ result }: { result: SetupResult }) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-soft">
        The studio is ready and you are signed in as its owner.
      </p>
      <RecoveryCodes codes={result.recoveryCodes} />
      {result.inviteCode && (
        <div className="flex flex-col gap-2">
          <span className="silk">Invite code for new members</span>
          <CopyField value={result.inviteCode} label="invite code" />
          <p className="text-sm text-label">
            Only its fingerprint is stored. You can issue a new one from Studio settings.
          </p>
        </div>
      )}
      <Button
        variant="fire"
        size="lg"
        onClick={() => enterStudio("/profile?welcome=1")}
        icon={<ArrowRight aria-hidden className="size-4.5" />}
      >
        Enter the studio
      </Button>
    </div>
  );
}
