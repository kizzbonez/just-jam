"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { parseRoomRef } from "@/features/rooms/schemas";
import { readForm } from "@/lib/read-form";
import { Button } from "@/ui/primitives/button";
import { Input } from "@/ui/primitives/input";

/** Jump straight to a room from its id or a pasted link. */
export function JoinById() {
  const router = useRouter();
  const [invalid, setInvalid] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    const slug = parseRoomRef(readForm(event).room ?? "");
    setInvalid(!slug);
    if (slug) router.push(`/room/${slug}`);
  }

  return (
    <form onSubmit={submit} className="flex items-start gap-2" noValidate>
      <div className="flex flex-col gap-1">
        <Input
          name="room"
          mono
          invalid={invalid}
          aria-label="Room id or link"
          placeholder="abc-defg-hjk"
          autoComplete="off"
          className="w-44 sm:w-52"
        />
        {invalid && (
          <span role="alert" className="text-xs text-crimson-300">
            That is not a room id or link.
          </span>
        )}
      </div>
      <Button type="submit" icon={<ArrowRight aria-hidden className="size-4" />}>
        Join
      </Button>
    </form>
  );
}
