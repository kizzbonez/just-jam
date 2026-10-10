"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TotpEnroll } from "@/features/auth/components/security/totp-enroll";
import { TotpManage } from "@/features/auth/components/security/totp-manage";
import { RecoveryCodes } from "@/ui/patterns/recovery-codes";
import { Button } from "@/ui/primitives/button";

export interface TotpPanelProps {
  enabled: boolean;
  isOwner: boolean;
  recoveryCodesLeft: number;
}

export function TotpPanel({ enabled, isOwner, recoveryCodesLeft }: TotpPanelProps) {
  const router = useRouter();
  const [codes, setCodes] = useState<string[] | null>(null);

  function show(next: string[]) {
    setCodes(next);
    router.refresh();
  }

  if (codes) {
    return (
      <div className="flex flex-col gap-5">
        <RecoveryCodes codes={codes} />
        <Button className="self-start" onClick={() => setCodes(null)}>
          I saved them
        </Button>
      </div>
    );
  }

  return enabled ? (
    <TotpManage
      canDisable={!isOwner}
      recoveryCodesLeft={recoveryCodesLeft}
      onCodes={show}
      onDisabled={() => router.refresh()}
    />
  ) : (
    <TotpEnroll onEnabled={show} />
  );
}
