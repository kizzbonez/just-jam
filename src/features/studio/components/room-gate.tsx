"use client";

import { DoorOpen } from "lucide-react";
import type { FormEvent } from "react";
import type { RoomTicket } from "@/features/rooms/server/issue-ticket";
import type { RoomDoor } from "@/features/rooms/server/room-queries";
import { api } from "@/lib/api-client";
import { readForm } from "@/lib/read-form";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";
import { RackUnit } from "@/ui/rack/rack-unit";

export interface RoomGateProps {
  door: RoomDoor;
  /** Shown when a previous session ended, for example after being removed. */
  notice?: string | null;
  onEnter: (ticket: RoomTicket) => void;
}

/**
 * The step before audio starts. Entering is a deliberate click, which is also
 * the user gesture browsers require before audio may play.
 */
export function RoomGate({ door, notice, onEnter }: RoomGateProps) {
  const action = useApiAction();
  const pinError = action.fields.pin;

  async function submit(event: FormEvent<HTMLFormElement>) {
    const body = readForm(event);
    const ticket = await action.run(() =>
      api<RoomTicket>(`/api/rooms/${door.slug}/ticket`, { body }),
    );
    if (ticket) onEnter(ticket);
  }

  return (
    <RackUnit label="Room" code={door.slug} className="mx-auto max-w-xl" bodyClassName="p-6">
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-3xl leading-none font-bold tracking-[0.06em] text-ink uppercase">
            {door.name}
          </h1>
          <p className="text-sm text-label">
            {door.isHost ? "You host this room." : `Hosted by ${door.hostName}.`} Up to{" "}
            {door.maxPeers} players.
          </p>
        </div>
        {notice && <Notice>{notice}</Notice>}
        {action.error && !pinError && <Notice tone="error">{action.error}</Notice>}
        {door.needsPin && (
          <Field label="Room PIN" htmlFor="room-pin" error={pinError}>
            <Input id="room-pin" name="pin" mono autoComplete="off" maxLength={12} autoFocus />
          </Field>
        )}
        <p className="text-sm text-ink-soft">
          Use headphones. Your browser will ask for access to your audio interface, and nothing is
          sent until you arm your input inside the room.
        </p>
        <Button
          type="submit"
          variant="fire"
          size="lg"
          loading={action.pending}
          icon={<DoorOpen aria-hidden className="size-4.5" />}
        >
          Enter room
        </Button>
      </form>
    </RackUnit>
  );
}
