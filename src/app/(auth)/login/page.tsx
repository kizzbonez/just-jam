import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFaceplate } from "@/features/auth/components/auth-faceplate";
import { LoginGate } from "@/features/auth/components/login-gate";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthFaceplate label="Sign in" code="TL-AUTH" footer="Private studio. Authorized players only.">
      <Suspense fallback={<Skeleton rows={3} />}>
        <LoginGate />
      </Suspense>
    </AuthFaceplate>
  );
}
