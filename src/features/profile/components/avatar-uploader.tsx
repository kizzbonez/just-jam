"use client";

import { ImageUp, Trash2 } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { useAvatarUpload } from "@/features/profile/components/use-avatar-upload";
import { cn } from "@/lib/cn";
import { Avatar } from "@/ui/primitives/avatar";
import { Button } from "@/ui/primitives/button";

export interface AvatarUploaderProps {
  name: string;
  src: string | null;
}

export function AvatarUploader({ name, src }: AvatarUploaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const { busy, error, upload, remove } = useAvatarUpload();

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void upload(file);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={src} size="lg" />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={pick}
            className="sr-only"
            aria-label="Choose a profile picture"
            tabIndex={-1}
          />
          <Button
            size="sm"
            loading={busy}
            onClick={() => input.current?.click()}
            icon={<ImageUp aria-hidden className="size-4" />}
          >
            Upload picture
          </Button>
          {src && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={remove}
              icon={<Trash2 aria-hidden className="size-4" />}
            >
              Remove
            </Button>
          )}
        </div>
        <p
          role={error ? "alert" : undefined}
          className={cn("text-sm", error ? "text-crimson-300" : "text-label")}
        >
          {error ?? "JPEG, PNG or WebP. Cropped to a square."}
        </p>
      </div>
    </div>
  );
}
