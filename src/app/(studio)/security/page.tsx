import type { Metadata } from "next";
import { Suspense } from "react";
import { SecurityPanels } from "@/features/auth/components/security/security-panels";
import { PageHeader } from "@/ui/patterns/page-header";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage({ searchParams }: PageProps<"/security">) {
  return (
    <>
      <PageHeader
        title="Security"
        description="Protect your account with a second factor and review where you are signed in."
      />
      <Suspense fallback={<Skeleton rows={4} />}>
        <SecurityPanels searchParams={searchParams} />
      </Suspense>
    </>
  );
}
