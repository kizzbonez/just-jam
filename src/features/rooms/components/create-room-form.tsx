"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DEFAULT_PEERS, MAX_PEERS, MIN_PEERS } from "@/features/rooms/constants";
import type { RoomVisibilityValue } from "@/features/rooms/constants";
import { api } from "@/lib/api-client";
import { readForm } from "@/lib/read-form";
import { useApiAction } from "@/lib/use-api-action";
import { Button } from "@/ui/primitives/button";
import { ChoiceCard } from "@/ui/primitives/choice-card";
import { Field } from "@/ui/primitives/field";
import { Input } from "@/ui/primitives/input";
import { Notice } from "@/ui/primitives/notice";
import { Select } from "@/ui/primitives/select";

const VISIBILITY_CHOICES = [
  {
    value: "PRIVATE",
    title: "Private",
    description: "Not listed. Only people with the link can find it.",
  },
  {
    value: "PUBLIC",
    title: "Public",
    description: "Listed in the lobby for every member of this studio.",
  },
] as const;

const SIZES = Array.from({ length: MAX_PEERS - MIN_PEERS + 1 }, (_, index) => MIN_PEERS + index);

/** Creates a room and takes the host straight into it. */
export function CreateRoomForm() {
  const router = useRouter();
  const action = useApiAction();
  const [visibility, setVisibility] = useState<RoomVisibilityValue>("PRIVATE");
  const { fields } = action;

  async function submit(event: FormEvent<HTMLFormElement>) {
    const body = { ...readForm(event), visibility };
    const room = await action.run(() => api<{ slug: string }>("/api/rooms", { body }));
    if (room) router.push(`/room/${room.slug}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {action.error && !Object.keys(fields).length && <Notice tone="error">{action.error}</Notice>}
      <Field label="Room name" htmlFor="room-name" error={fields.name}>
        <Input id="room-name" name="name" placeholder="Thursday rehearsal" required autoFocus />
      </Field>
      <fieldset className="grid gap-2.5 sm:grid-cols-2">
        <legend className="silk mb-2">Visibility</legend>
        {VISIBILITY_CHOICES.map((choice) => (
          <ChoiceCard
            key={choice.value}
            name="visibility-choice"
            checked={visibility === choice.value}
            onSelect={(value) => setVisibility(value as RoomVisibilityValue)}
            {...choice}
          />
        ))}
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="PIN (optional)"
          htmlFor="room-pin"
          hint="4 to 12 letters or digits."
          error={fields.pin}
        >
          <Input id="room-pin" name="pin" mono autoComplete="off" maxLength={12} />
        </Field>
        <Field label="Players" htmlFor="room-size" error={fields.maxPeers}>
          <Select id="room-size" name="maxPeers" defaultValue={DEFAULT_PEERS}>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                Up to {size}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Button
        type="submit"
        variant="fire"
        size="lg"
        loading={action.pending}
        icon={<Plus aria-hidden className="size-4.5" />}
      >
        Create and enter
      </Button>
    </form>
  );
}
