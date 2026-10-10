import { PasswordPanel } from "@/features/auth/components/security/password-panel";
import { SessionsPanel } from "@/features/auth/components/security/sessions-panel";
import { TotpPanel } from "@/features/auth/components/security/totp-panel";
import { requireUser } from "@/features/auth/server/current-user";
import { countRecoveryCodes } from "@/features/auth/server/recovery-codes";
import { listSessions } from "@/features/auth/server/sessions";
import { Led } from "@/ui/primitives/led";
import { Notice } from "@/ui/primitives/notice";
import { RackUnit } from "@/ui/rack/rack-unit";

type Search = Promise<Record<string, string | string[] | undefined>>;

export async function SecurityPanels({ searchParams }: { searchParams: Search }) {
  const user = await requireUser();
  const [sessions, codesLeft, query] = await Promise.all([
    listSessions(user.id, user.sessionId),
    countRecoveryCodes(user.id),
    searchParams,
  ]);
  const enrollRequired = query.enroll === "required" && !user.totpEnabled;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {enrollRequired && (
        <Notice tone="error" className="lg:col-span-2">
          Owner accounts need two-factor authentication. Set it up below to reach Studio settings.
        </Notice>
      )}
      <RackUnit
        label="Two-factor"
        code="TL-SEC-01"
        aside={
          <span className="silk flex items-center gap-2">
            <Led on={user.totpEnabled} /> {user.totpEnabled ? "On" : "Off"}
          </span>
        }
      >
        <TotpPanel
          enabled={user.totpEnabled}
          isOwner={user.role === "ADMIN"}
          recoveryCodesLeft={codesLeft}
        />
      </RackUnit>
      <RackUnit label="Password" code="TL-SEC-02">
        <PasswordPanel />
      </RackUnit>
      <RackUnit label="Signed-in devices" code="TL-SEC-03" className="lg:col-span-2">
        <SessionsPanel sessions={sessions} />
      </RackUnit>
    </div>
  );
}
