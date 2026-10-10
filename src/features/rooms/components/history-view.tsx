import Link from "next/link";
import { requireUser } from "@/features/auth/server/current-user";
import { listVisits } from "@/features/rooms/server/room-queries";
import { formatUtc } from "@/lib/format";
import { Badge } from "@/ui/primitives/badge";
import { RackUnit } from "@/ui/rack/rack-unit";

export async function HistoryView() {
  const user = await requireUser();
  const visits = await listVisits(user.id);
  return (
    <RackUnit label="Session log" code="TL-LOG" bodyClassName="py-1">
      {visits.length === 0 ? (
        <p className="py-4 text-sm text-label">
          Nothing yet. Rooms you enter are listed here so you can find them again.
        </p>
      ) : (
        <ul className="flex flex-col">
          {visits.map((visit) => (
            <li
              key={visit.id}
              className="etch-b flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3 last:border-0 last:shadow-none"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-display text-base font-semibold tracking-wide text-ink uppercase">
                    {visit.roomName}
                  </span>
                  <Badge tone={visit.open ? "wine" : "steel"}>{visit.open ? "Open" : "Closed"}</Badge>
                </span>
                <span className="text-sm text-label">Hosted by {visit.hostName}</span>
              </div>
              <div className="flex items-center gap-4">
                <time dateTime={visit.joinedAt} className="readout text-xs text-label">
                  {formatUtc(visit.joinedAt)}
                </time>
                {visit.open && (
                  <Link
                    href={`/room/${visit.slug}`}
                    className="silk text-ink underline-offset-4 hover:underline"
                  >
                    Rejoin
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </RackUnit>
  );
}
