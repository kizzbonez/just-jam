"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { PasswordPair } from "@/features/auth/components/password-pair";
import { enterStudio } from "@/features/auth/navigation";
import { api } from "@/lib/api-client";
import { readForm } from "@/lib/read-form";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";

export function RegisterForm({ inviteOnly }: { inviteOnly: boolean }) {
  const action = useApiAction();
  const { fields } = action;

  async function submit(event: FormEvent<HTMLFormElement>) {
    const body = readForm(event);
    const done = await action.run(() => api("/api/auth/register", { body }));
    if (done) enterStudio("/profile?welcome=1");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {action.error && !Object.keys(fields).length && <Notice tone="error">{action.error}</Notice>}
      <Field label="Email" htmlFor="email" error={fields.email}>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field
        label="Display name"
        htmlFor="displayName"
        hint="Shown to the people you play with."
        error={fields.displayName}
      >
        <Input id="displayName" name="displayName" autoComplete="nickname" required />
      </Field>
      <PasswordPair errors={fields} />
      {inviteOnly && (
        <Field
          label="Invite code"
          htmlFor="inviteCode"
          hint="This studio is invite-only. The owner has the code."
          error={fields.inviteCode}
        >
          <Input id="inviteCode" name="inviteCode" mono autoComplete="off" required />
        </Field>
      )}
      <Button
        type="submit"
        variant="fire"
        size="lg"
        loading={action.pending}
        icon={<UserPlus aria-hidden className="size-4.5" />}
      >
        Create account
      </Button>
      <p className="text-center text-sm text-label">
        Already registered?{" "}
        <Link href="/login" className="text-ink underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
