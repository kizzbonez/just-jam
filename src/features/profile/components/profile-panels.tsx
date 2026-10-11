import { requireUser } from "@/features/auth/server/current-user";
import { AudioDefaultsPanel } from "@/features/profile/components/audio-defaults-panel";
import { AvatarUploader } from "@/features/profile/components/avatar-uploader";
import { PlayerForm } from "@/features/profile/components/player-form";
import { loadAudioProfile } from "@/features/profile/server/profile";
import { avatarUrl } from "@/ui/primitives/avatar";
import { Notice } from "@/ui/primitives/notice";
import { RackUnit } from "@/ui/rack/rack-unit";

type Search = Promise<Record<string, string | string[] | undefined>>;

export async function ProfilePanels({ searchParams }: { searchParams: Search }) {
  const user = await requireUser();
  const [audio, query] = await Promise.all([loadAudioProfile(user.id), searchParams]);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      {query.welcome === "1" && (
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
      <RackUnit label="Audio defaults" code="TL-ID-02">
        <AudioDefaultsPanel initial={audio} />
      </RackUnit>
    </div>
  );
}
