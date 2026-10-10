"use client";

import type { FormEvent } from "react";
import { readForm } from "@/lib/read-form";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";

export interface PasswordPromptProps {
  id: string;
  action: string;
  danger?: boolean;
  pending: boolean;
  error?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

/** Inline re-authentication before a sensitive change. */
export function PasswordPrompt(props: PasswordPromptProps) {
  const { id, action, danger, pending, error, onSubmit, onCancel } = props;

  function submit(event: FormEvent<HTMLFormElement>) {
    onSubmit(readForm(event).password ?? "");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Confirm with your password" htmlFor={id} error={error}>
        <Input
          id={id}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
        />
      </Field>
      <div className="flex gap-3">
        <Button type="submit" variant={danger ? "danger" : "fire"} loading={pending}>
          {action}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
