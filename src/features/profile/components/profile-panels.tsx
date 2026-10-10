import { requireUser } from "@/features/auth/server/current-user";
import { AvatarUploader } from "@/features/profile/components/avatar-uploader";
import { PlayerForm } from "@/features/profile/components/player-form";
import { Notice } from "@/ui/primitives/notice";
import { avatarUrl } from "@/ui/primitives/avatar";
import { RackUnit } from "@/ui/rack/rack-unit";

type Search = Promise<Record<string, string | string[] | undefined>>;

export async function ProfilePanels({ searchParams }: { searchParams: Search }) {
  const user = await requireUser();
  const welcome = (await searchParams).welcome === "1";
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {welcome && (
        <Notice tone="success" className="lg:col-span-2">
          Welcome to the studio, {user.displayName}. Set your name and instrument here, then head to
          the lobby to open your first room.
        </Notice>
      )}
      <RackUnit label="Player" code="TL-ID-01">
        <div className="flex flex-col gap-6">
          <AvatarUploader name={user.displayName} src={avatarUrl(user)} />
          <PlayerForm displayName={user.displayName} instrument={user.instrument} />
        </div>
      </RackUnit>
    </div>
  );
}
