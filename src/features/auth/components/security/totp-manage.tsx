"use client";

import { useState } from "react";
import { PasswordPrompt } from "@/features/auth/components/security/password-prompt";
import { api } from "@/lib/api-client";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";

type Intent = "codes" | "disable";

export interface TotpManageProps {
  canDisable: boolean;
  recoveryCodesLeft: number;
  onCodes: (codes: string[]) => void;
  onDisabled: () => void;
}

/** On state: issue fresh recovery codes or, for members, turn two-factor off. */
export function TotpManage({ canDisable, recoveryCodesLeft, onCodes, onDisabled }: TotpManageProps) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const action = useApiAction();

  async function submit(password: string) {
    const body = { password };
    if (intent === "codes") {
      const result = await action.run(() =>
        api<{ recoveryCodes: string[] }>("/api/security/recovery-codes", { body }),
      );
      if (!result) return;
      setIntent(null);
      onCodes(result.recoveryCodes);
      return;
    }
    const done = await action.run(() => api("/api/security/totp/disable", { body }));
    if (!done) return;
    setIntent(null);
    onDisabled();
  }

  if (intent) {
    return (
      <PasswordPrompt
        id={`totp-${intent}`}
        action={intent === "codes" ? "Issue new codes" : "Turn off two-factor"}
        danger={intent === "disable"}
        pending={action.pending}
        error={action.fields.password ?? action.error ?? undefined}
        onSubmit={submit}
        onCancel={() => setIntent(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Sign-in asks for a code from your authenticator app. You have{" "}
        <span className="readout text-ink">{recoveryCodesLeft}</span> unused recovery{" "}
        {recoveryCodesLeft === 1 ? "code" : "codes"}.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setIntent("codes")}>New recovery codes</Button>
        {canDisable && (
          <Button variant="danger" onClick={() => setIntent("disable")}>
            Turn off
          </Button>
        )}
      </div>
      {!canDisable && (
        <p className="text-sm text-label">Owner accounts always keep two-factor on.</p>
      )}
    </div>
  );
}
