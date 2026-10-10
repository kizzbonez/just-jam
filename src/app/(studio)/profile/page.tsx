import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfilePanels } from "@/features/profile/components/profile-panels";
import { PageHeader } from "@/ui/patterns/page-header";
import { Skeleton } from "@/ui/patterns/skeleton";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <>
      <PageHeader
        title="Profile & audio"
        description="How you appear to other players, and the audio settings your rooms start with."
      />
      <Suspense fallback={<Skeleton rows={4} />}>
        <ProfilePanels searchParams={searchParams} />
      </Suspense>
    </>
  );
}
