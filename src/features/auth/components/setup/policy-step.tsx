"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { SetupDraft } from "@/features/auth/components/setup/setup-wizard";
import type { RegistrationModeValue } from "@/features/auth/constants";
import { REGISTRATION_CHOICES } from "@/features/auth/registration-choices";
import type { EnrollmentOffer } from "@/features/auth/server/totp-enrollment";
import { api } from "@/lib/api-client";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { ChoiceCard } from "@/ui/primitives/choice-card";
import { Notice } from "@/ui/primitives/notice";

export interface PolicyStepProps {
  draft: SetupDraft;
  onBack: () => void;
  onDone: (mode: RegistrationModeValue, offer: EnrollmentOffer) => void;
}

export function PolicyStep({ draft, onBack, onDone }: PolicyStepProps) {
  const [mode, setMode] = useState(draft.registrationMode);
  const action = useApiAction();

  async function next() {
    const body = { ...draft, registrationMode: mode };
    const offer = await action.run(() => api<EnrollmentOffer>("/api/setup/begin", { body }));
    if (offer) onDone(mode, offer);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-ink-soft">Who may join this studio? You can change this later.</p>
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">Registration policy</legend>
        {REGISTRATION_CHOICES.map((choice) => (
          <ChoiceCard
            key={choice.value}
            name="registrationMode"
            checked={mode === choice.value}
            onSelect={(value) => setMode(value as RegistrationModeValue)}
            {...choice}
          />
        ))}
      </fieldset>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="fire"
          className="flex-1"
          loading={action.pending}
          onClick={next}
          icon={<ArrowRight aria-hidden className="size-4" />}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
