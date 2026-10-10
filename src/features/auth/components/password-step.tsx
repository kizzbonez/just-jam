"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { enterStudio } from "@/features/auth/navigation";
import { api } from "@/lib/api-client";
import { readForm } from "@/lib/read-form";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";

export interface PasswordStepProps {
  canRegister: boolean;
  onSecondFactor: () => void;
}

export function PasswordStep({ canRegister, onSecondFactor }: PasswordStepProps) {
  const action = useApiAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    const body = readForm(event);
    const result = await action.run(() =>
      api<{ mfaRequired: boolean }>("/api/auth/login", { body }),
    );
    if (!result) return;
    if (result.mfaRequired) onSecondFactor();
    else enterStudio();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {action.error && !Object.keys(action.fields).length && (
        <Notice tone="error">{action.error}</Notice>
      )}
      <Field label="Email" htmlFor="email" error={action.fields.email}>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" error={action.fields.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Button
        type="submit"
        variant="fire"
        size="lg"
        loading={action.pending}
        icon={<LogIn aria-hidden className="size-4.5" />}
      >
        Sign in
      </Button>
      {canRegister && (
        <p className="text-center text-sm text-label">
          New here?{" "}
          <Link href="/register" className="text-ink underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      )}
    </form>
  );
}
