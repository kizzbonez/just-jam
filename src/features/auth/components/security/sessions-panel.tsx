"use client";

import { MonitorSmartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import type { SessionSummary } from "@/features/auth/server/sessions";
import { api } from "@/lib/api-client";
import { describeAgent, formatUtc } from "@/lib/format";
import { useApiAction } from "@/lib/use-api-action";
import { Badge } from "@/ui/primitives/badge";
import { Button } from "@/ui/primitives/button";
import { Notice } from "@/ui/primitives/notice";

/** Every device signed in to this account, with a kill switch for the others. */
export function SessionsPanel({ sessions }: { sessions: SessionSummary[] }) {
  const router = useRouter();
  const action = useApiAction();

  async function revoke(id: string) {
    const done = await action.run(() => api(`/api/security/sessions/${id}`, { method: "DELETE" }));
    if (done) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {action.error && <Notice tone="error">{action.error}</Notice>}
      <ul className="flex flex-col">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="etch-b flex flex-wrap items-center justify-between gap-3 py-3 last:border-0 last:shadow-none"
          >
            <div className="flex min-w-0 items-center gap-3">
              <MonitorSmartphone aria-hidden className="size-5 shrink-0 text-label" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  {describeAgent(session.userAgent)}
                  {session.current && <Badge tone="steel">This device</Badge>}
                </span>
                <span className="readout truncate text-xs text-label">
                  {session.ip ?? "unknown address"} · last active {formatUtc(session.lastSeenAt)}
                </span>
              </div>
            </div>
            {!session.current && (
              <Button size="sm" variant="danger" onClick={() => revoke(session.id)}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
