"use client";

import { ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { enterStudio } from "@/features/auth/navigation";
import { api } from "@/lib/api-client";
import { readForm } from "@/lib/read-form";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";

export function MfaStep({ onBack }: { onBack: () => void }) {
  const action = useApiAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    const body = readForm(event);
    const done = await action.run(() => api("/api/auth/mfa", { body }));
    if (done) enterStudio();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <Field
        label="Authentication code"
        htmlFor="code"
        hint="The 6-digit code from your authenticator app, or one of your recovery codes."
      >
        <Input
          id="code"
          name="code"
          mono
          inputMode="text"
          autoComplete="one-time-code"
          placeholder="000000"
          required
          autoFocus
        />
      </Field>
      <Button
        type="submit"
        variant="fire"
        size="lg"
        loading={action.pending}
        icon={<ShieldCheck aria-hidden className="size-4.5" />}
      >
        Verify
      </Button>
      <Button variant="ghost" onClick={onBack}>
        Use a different account
      </Button>
    </form>
  );
}
