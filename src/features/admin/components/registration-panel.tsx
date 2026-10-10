"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RegistrationModeValue } from "@/features/auth/constants";
import { REGISTRATION_CHOICES } from "@/features/auth/registration-choices";
import { api } from "@/lib/api-client";
import { useApiAction } from "@/lib/use-api-action";
import { CopyField } from "@/ui/patterns/copy-field";
import { Button } from "@/ui/primitives/button";
import { ChoiceCard } from "@/ui/primitives/choice-card";
import { Notice } from "@/ui/primitives/notice";
import { Toggle } from "@/ui/primitives/toggle";

export interface RegistrationPanelProps {
  mode: RegistrationModeValue;
  hasInviteCode: boolean;
}

/** Who may register, and the invite code they need when it is invite-only. */
export function RegistrationPanel({ mode: initial, hasInviteCode }: RegistrationPanelProps) {
  const router = useRouter();
  const action = useApiAction();
  const [mode, setMode] = useState(initial);
  const [rotate, setRotate] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);

  async function save() {
    const body = { registrationMode: mode, rotateInvite: rotate };
    const result = await action.run(() =>
      api<{ inviteCode: string | null }>("/api/admin/settings", { method: "PUT", body }),
    );
    if (!result) return;
    setIssued(result.inviteCode);
    setRotate(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <fieldset className="grid gap-2.5 md:grid-cols-3">
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
      {mode === "INVITE" && hasInviteCode && (
        <Toggle
          checked={rotate}
          onChange={setRotate}
          label="Issue a new invite code (the current one stops working)"
        />
      )}
      {issued && (
        <div className="flex flex-col gap-2">
          <span className="silk">New invite code, shown once</span>
          <CopyField value={issued} label="invite code" />
        </div>
      )}
      <Button variant="fire" className="self-start" loading={action.pending} onClick={save}>
        Save policy
      </Button>
    </div>
  );
}
