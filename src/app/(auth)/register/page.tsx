import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFaceplate } from "@/features/auth/components/auth-faceplate";
import { RegisterGate } from "@/features/auth/components/register-gate";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthFaceplate label="Create account" code="TL-AUTH">
      <Suspense fallback={<Skeleton rows={4} />}>
        <RegisterGate />
      </Suspense>
    </AuthFaceplate>
  );
}
