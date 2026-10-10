import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFaceplate } from "@/features/auth/components/auth-faceplate";
import { SetupGate } from "@/features/auth/components/setup/setup-gate";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "First-run setup" };

export default function SetupPage() {
  return (
    <AuthFaceplate label="First-run setup" code="TL-INIT">
      <Suspense fallback={<Skeleton rows={4} />}>
        <SetupGate />
      </Suspense>
    </AuthFaceplate>
  );
}
