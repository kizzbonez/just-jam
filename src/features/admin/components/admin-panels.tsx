import { RegistrationPanel } from "@/features/admin/components/registration-panel";
import { loadAdminOverview } from "@/features/admin/server/settings";
import { requireAdmin } from "@/features/auth/server/current-user";
import { RackUnit } from "@/ui/rack/rack-unit";
import { Readout } from "@/ui/rack/readout";

export async function AdminPanels() {
  await requireAdmin();
  const overview = await loadAdminOverview();
  return (
    <div className="flex flex-col gap-5">
      <RackUnit label="Studio" code="TL-ADM-01">
        <div className="grid max-w-md grid-cols-2 gap-4">
          <Readout label="Members" value={overview.members} />
          <Readout label="Open rooms" value={overview.openRooms} />
        </div>
      </RackUnit>
      <RackUnit label="Registration" code="TL-ADM-02">
        <RegistrationPanel mode={overview.mode} hasInviteCode={overview.hasInviteCode} />
      </RackUnit>
    </div>
  );
}
