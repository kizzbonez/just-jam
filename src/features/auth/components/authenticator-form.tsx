"use client";

import { ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import type { EnrollmentOffer } from "@/features/auth/server/totp-enrollment";
import { readForm } from "@/lib/read-form";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";

export interface AuthenticatorFormProps {
  offer: EnrollmentOffer;
  pending: boolean;
  error: string | null;
  codeError?: string;
  onSubmit: (code: string) => void;
}

/** Shows the QR code and secret, then asks for the first code as proof of pairing. */
export function AuthenticatorForm(props: AuthenticatorFormProps) {
  const { offer, pending, error, codeError, onSubmit } = props;

  function submit(event: FormEvent<HTMLFormElement>) {
    onSubmit(readForm(event).code ?? "");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {error && !codeError && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="well shrink-0 border border-etch p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={offer.qrDataUrl} alt="QR code for your authenticator app" className="size-44" />
        </div>
        <div className="flex min-w-0 flex-col gap-3 text-sm text-ink-soft">
          <p>Scan this with an authenticator app such as Aegis, 1Password or Google Authenticator.</p>
          <div className="flex flex-col gap-1.5">
            <span className="silk">Or enter the key by hand</span>
            <code className="readout well border border-etch px-2.5 py-2 text-xs break-all text-ink">
              {offer.secret}
            </code>
          </div>
        </div>
      </div>
      <Field label="First code" htmlFor="totp-code" error={codeError}>
        <Input
          id="totp-code"
          name="code"
          mono
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          required
        />
      </Field>
      <Button
        type="submit"
        variant="fire"
        loading={pending}
        icon={<ShieldCheck aria-hidden className="size-4" />}
      >
        Confirm and turn on
      </Button>
    </form>
  );
}
