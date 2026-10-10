import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateRoomButton } from "@/features/rooms/components/create-room-button";
import { JoinById } from "@/features/rooms/components/join-by-id";
import { LobbyView } from "@/features/rooms/components/lobby-view";
import { PageHeader } from "@/ui/patterns/page-header";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "Lobby" };

export default function LobbyPage() {
  return (
    <>
      <PageHeader
        title="Lobby"
        description="Open a room, share its link and play. Audio goes player to player through the QUIC relay."
        actions={
          <>
            <JoinById />
            <CreateRoomButton />
          </>
        }
      />
      <Suspense fallback={<Skeleton rows={4} />}>
        <LobbyView />
      </Suspense>
    </>
  );
}
