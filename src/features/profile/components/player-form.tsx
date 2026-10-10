"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { INSTRUMENT_SUGGESTIONS } from "@/features/profile/schemas";
import { api } from "@/lib/api-client";
import { readForm } from "@/lib/read-form";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";

export interface PlayerFormProps {
  displayName: string;
  instrument: string;
}

/** Name and instrument tag, as the rest of the room sees them. */
export function PlayerForm({ displayName, instrument }: PlayerFormProps) {
  const router = useRouter();
  const action = useApiAction();
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    const body = readForm(event);
    setSaved(false);
    const done = await action.run(() => api("/api/profile", { method: "PATCH", body }));
    if (!done) return;
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {saved && <Notice tone="success">Profile saved.</Notice>}
      {action.error && !Object.keys(action.fields).length && (
        <Notice tone="error">{action.error}</Notice>
      )}
      <Field label="Display name" htmlFor="displayName" error={action.fields.displayName}>
        <Input id="displayName" name="displayName" defaultValue={displayName} required />
      </Field>
      <Field
        label="Instrument tag"
        htmlFor="instrument"
        hint="Shown on your channel strip, for example Lead Guitar or Bass."
        error={action.fields.instrument}
      >
        <Input
          id="instrument"
          name="instrument"
          list="instrument-suggestions"
          defaultValue={instrument}
          required
        />
        <datalist id="instrument-suggestions">
          {INSTRUMENT_SUGGESTIONS.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </Field>
      <Button type="submit" loading={action.pending} className="self-start">
        Save profile
      </Button>
    </form>
  );
}
