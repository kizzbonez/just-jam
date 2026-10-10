import type { Metadata } from "next";
import { Suspense } from "react";
import { RoomEntry } from "@/features/studio/components/room-entry";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "Room" };

export default function RoomPage({ params }: PageProps<"/room/[slug]">) {
  return (
    <Suspense fallback={<Skeleton rows={5} className="mx-auto max-w-xl" />}>
      <RoomEntry params={params} />
    </Suspense>
  );
}
