"use client";

import { KeyRound } from "lucide-react";
import type { FormEvent } from "react";
import { api } from "@/lib/api-client";
import { readForm } from "@/lib/read-form";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";

export function TokenStep({ onDone }: { onDone: (token: string) => void }) {
  const action = useApiAction();

  async function submit(event: FormEvent<HTMLFormElement>) {
    const token = (readForm(event).token ?? "").trim();
    const ok = await action.run(() => api("/api/setup/verify", { body: { token } }));
    if (ok) onDone(token);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <p className="text-sm text-ink-soft">
        This studio has no owner yet. A one-time setup token was printed in the server log when it
        started. Paste it here to prove you run this install.
      </p>
      <pre className="well readout overflow-x-auto border border-etch p-3 text-xs text-label">
        docker compose logs web | grep -A4 &quot;first-run setup&quot;
      </pre>
      {action.error && !action.fields.token && <Notice tone="error">{action.error}</Notice>}
      <Field label="Setup token" htmlFor="token" error={action.fields.token}>
        <Input id="token" name="token" mono autoComplete="off" required autoFocus />
      </Field>
      <Button
        type="submit"
        variant="fire"
        loading={action.pending}
        icon={<KeyRound aria-hidden className="size-4" />}
      >
        Unlock setup
      </Button>
    </form>
  );
}
