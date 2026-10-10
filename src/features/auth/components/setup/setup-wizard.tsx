"use client";

import { useState } from "react";
import { AuthenticatorStep } from "@/features/auth/components/setup/authenticator-step";
import { DoneStep } from "@/features/auth/components/setup/done-step";
import { OwnerStep } from "@/features/auth/components/setup/owner-step";
import { PolicyStep } from "@/features/auth/components/setup/policy-step";
import { TokenStep } from "@/features/auth/components/setup/token-step";
import type { RegistrationModeValue } from "@/features/auth/constants";
import type { SetupResult } from "@/features/auth/server/setup";
import type { EnrollmentOffer } from "@/features/auth/server/totp-enrollment";
import { Stepper } from "@/ui/patterns/stepper";

const STEPS = ["Token", "Owner", "Policy", "Two-factor", "Done"] as const;

export interface SetupDraft {
  token: string;
  email: string;
  displayName: string;
  password: string;
  registrationMode: RegistrationModeValue;
}

const EMPTY: SetupDraft = {
  token: "",
  email: "",
  displayName: "",
  password: "",
  registrationMode: "INVITE",
};

/** First-run wizard. Nothing is written until the final authenticator check passes. */
export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY);
  const [offer, setOffer] = useState<EnrollmentOffer | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);

  function advance(patch: Partial<SetupDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setStep((current) => current + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={STEPS} current={step} />
      {step === 0 && <TokenStep onDone={(token) => advance({ token })} />}
      {step === 1 && <OwnerStep draft={draft} onDone={advance} />}
      {step === 2 && (
        <PolicyStep
          draft={draft}
          onBack={() => setStep(1)}
          onDone={(registrationMode, next) => {
            setOffer(next);
            advance({ registrationMode });
          }}
        />
      )}
      {step === 3 && offer && (
        <AuthenticatorStep
          draft={draft}
          offer={offer}
          onDone={(outcome) => {
            setResult(outcome);
            setStep(4);
          }}
        />
      )}
      {step === 4 && result && <DoneStep result={result} />}
    </div>
  );
}
