import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryView } from "@/features/rooms/components/history-view";
import { PageHeader } from "@/ui/patterns/page-header";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <>
      <PageHeader title="History" description="Rooms you have played in, most recent first." />
      <Suspense fallback={<Skeleton rows={4} />}>
        <HistoryView />
      </Suspense>
    </>
  );
}
