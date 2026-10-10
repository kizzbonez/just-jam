"use client";

import { AuthenticatorForm } from "@/features/auth/components/authenticator-form";
import type { SetupDraft } from "@/features/auth/components/setup/setup-wizard";
import type { SetupResult } from "@/features/auth/server/setup";
import type { EnrollmentOffer } from "@/features/auth/server/totp-enrollment";
import { api } from "@/lib/api-client";
import { useApiAction } from "@/lib/use-api-action";

export interface AuthenticatorStepProps {
  draft: SetupDraft;
  offer: EnrollmentOffer;
  onDone: (result: SetupResult) => void;
}

/** Final step: the first valid code creates the owner and closes setup. */
export function AuthenticatorStep({ draft, offer, onDone }: AuthenticatorStepProps) {
  const action = useApiAction();

  async function complete(code: string) {
    const body = { ...draft, enrollment: offer.enrollment, code };
    const result = await action.run(() => api<SetupResult>("/api/setup/complete", { body }));
    if (result) onDone(result);
  }

  return (
    <AuthenticatorForm
      offer={offer}
      pending={action.pending}
      error={action.error}
      codeError={action.fields.code}
      onSubmit={complete}
    />
  );
}
