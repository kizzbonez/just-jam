"use client";

import { ShieldPlus } from "lucide-react";
import { useState } from "react";
import { AuthenticatorForm } from "@/features/auth/components/authenticator-form";
import type { EnrollmentOffer } from "@/features/auth/server/totp-enrollment";
import { api } from "@/lib/api-client";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Notice } from "@/ui/primitives/notice";

/** Off state: starts enrollment, then confirms it with the first code. */
export function TotpEnroll({ onEnabled }: { onEnabled: (codes: string[]) => void }) {
  const [offer, setOffer] = useState<EnrollmentOffer | null>(null);
  const action = useApiAction();

  async function begin() {
    const next = await action.run(() =>
      api<EnrollmentOffer>("/api/security/totp/begin", { method: "POST" }),
    );
    if (next) setOffer(next);
  }

  async function confirm(code: string) {
    if (!offer) return;
    const body = { enrollment: offer.enrollment, code };
    const result = await action.run(() =>
      api<{ recoveryCodes: string[] }>("/api/security/totp/confirm", { body }),
    );
    if (result) onEnabled(result.recoveryCodes);
  }

  if (offer) {
    return (
      <AuthenticatorForm
        offer={offer}
        pending={action.pending}
        error={action.error}
        codeError={action.fields.code}
        onSubmit={confirm}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">
        Add a second step to sign-in: a 6-digit code from an authenticator app on your phone.
      </p>
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <Button
        variant="fire"
        className="self-start"
        loading={action.pending}
        onClick={begin}
        icon={<ShieldPlus aria-hidden className="size-4" />}
      >
        Set up authenticator
      </Button>
    </div>
  );
}
