import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPanels } from "@/features/admin/components/admin-panels";
import { PageHeader } from "@/ui/patterns/page-header";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "Studio settings" };

export default function AdminPage() {
  return (
    <>
      <PageHeader
        title="Studio settings"
        description="Install-wide policy. Only the owner account can see this page."
      />
      <Suspense fallback={<Skeleton rows={4} />}>
        <AdminPanels />
      </Suspense>
    </>
  );
}
