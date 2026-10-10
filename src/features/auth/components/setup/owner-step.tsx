"use client";

import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { SetupDraft } from "@/features/auth/components/setup/setup-wizard";
import { SetupBeginSchema } from "@/features/auth/schemas";
import { readForm } from "@/lib/read-form";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";

const OwnerSchema = SetupBeginSchema.pick({ email: true, displayName: true, password: true });

type Owner = Pick<SetupDraft, "email" | "displayName" | "password">;

export interface OwnerStepProps {
  draft: SetupDraft;
  onDone: (owner: Owner) => void;
}

/** Collects the owner account. Checked here so later steps cannot fail on it. */
export function OwnerStep({ draft, onDone }: OwnerStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    const parsed = OwnerSchema.safeParse(readForm(event));
    if (parsed.success) return onDone(parsed.data);
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
    setErrors(next);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <p className="text-sm text-ink-soft">
        Create the owner account. It manages who can register and is always protected by
        two-factor authentication.
      </p>
      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={draft.email}
          required
          autoFocus
        />
      </Field>
      <Field label="Display name" htmlFor="displayName" error={errors.displayName}>
        <Input id="displayName" name="displayName" defaultValue={draft.displayName} required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        hint="At least 10 characters."
        error={errors.password}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" variant="fire" icon={<ArrowRight aria-hidden className="size-4" />}>
        Continue
      </Button>
    </form>
  );
}
