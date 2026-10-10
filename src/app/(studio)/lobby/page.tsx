import type { Metadata } from "next";
import { PageHeader } from "@/ui/patterns/page-header";

export const metadata: Metadata = { title: "Lobby" };

export default function LobbyPage() {
  return <PageHeader title="Lobby" description="Rooms arrive in the next milestone." />;
}
