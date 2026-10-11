"use client";

import { useState, type FormEvent } from "react";
import { PasswordPair } from "@/features/auth/components/password-pair";
import { api } from "@/lib/api-client";
import { readForm } from "@/lib/read-form";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";

export function PasswordPanel() {
  const action = useApiAction();
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const body = readForm(event);
    setSaved(false);
    const done = await action.run(() => api("/api/security/password", { body }));
    if (!done) return;
    form.reset();
    setSaved(true);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {saved && (
        <Notice tone="success">Password changed. Your other devices were signed out.</Notice>
      )}
      {action.error && !Object.keys(action.fields).length && (
        <Notice tone="error">{action.error}</Notice>
      )}
      <Field
        label="Current password"
        htmlFor="currentPassword"
        error={action.fields.currentPassword}
      >
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <PasswordPair name="newPassword" label="New password" errors={action.fields} />
      <Button type="submit" loading={action.pending} className="self-start">
        Change password
      </Button>
    </form>
  );
}
