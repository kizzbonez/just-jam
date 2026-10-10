"use client";

import { useState } from "react";
import { MfaStep } from "@/features/auth/components/mfa-step";
import { PasswordStep } from "@/features/auth/components/password-step";

/** Two-stage sign-in: password first, then a second factor when the account has one. */
export function LoginForm({ canRegister }: { canRegister: boolean }) {
  const [needsCode, setNeedsCode] = useState(false);
  return needsCode ? (
    <MfaStep onBack={() => setNeedsCode(false)} />
  ) : (
    <PasswordStep canRegister={canRegister} onSecondFactor={() => setNeedsCode(true)} />
  );
}
