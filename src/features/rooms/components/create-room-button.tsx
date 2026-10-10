"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { CreateRoomForm } from "@/features/rooms/components/create-room-form";
import { Button } from "@/ui/primitives/button";
import { Modal } from "@/ui/primitives/modal";

export function CreateRoomButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="fire"
        onClick={() => setOpen(true)}
        icon={<Plus aria-hidden className="size-4" />}
      >
        New room
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New room">
        <CreateRoomForm />
      </Modal>
    </>
  );
}
