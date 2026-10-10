"use client";

import { ChevronDown, LogOut, Settings2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { hardNavigate } from "@/lib/hard-navigate";
import { useDismiss } from "@/lib/use-dismiss";
import { Avatar } from "@/ui/primitives/avatar";
import { Badge } from "@/ui/primitives/badge";

export interface UserMenuProps {
  name: string;
  instrument: string;
  avatar: string | null;
  isAdmin: boolean;
}

const ITEM =
  "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-carbon-800 hover:text-ink";

async function signOut() {
  await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  hardNavigate("/login");
}

/** Account chip with a drop-down for profile, security and sign-out. */
export function UserMenu({ name, instrument, avatar, isAdmin }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, close, open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2.5 rounded-[3px] py-1 pr-1.5 pl-1 transition-colors hover:bg-carbon-800"
      >
        <Avatar name={name} src={avatar} size="sm" />
        <span className="hidden max-w-36 truncate text-sm font-medium text-ink md:inline">{name}</span>
        <Badge className="hidden lg:inline-flex">{instrument}</Badge>
        <ChevronDown aria-hidden className="size-4 text-label" />
      </button>
      {open && (
        <div role="menu" className="glass absolute right-0 z-40 mt-2 w-56 rounded-md py-1.5" onClick={close}>
          <Link role="menuitem" href="/profile" className={ITEM}>
            <SlidersHorizontal aria-hidden className="size-4" /> Profile &amp; audio
          </Link>
          <Link role="menuitem" href="/security" className={ITEM}>
            <ShieldCheck aria-hidden className="size-4" /> Security
          </Link>
          {isAdmin && (
            <Link role="menuitem" href="/admin" className={ITEM}>
              <Settings2 aria-hidden className="size-4" /> Studio settings
            </Link>
          )}
          <button type="button" role="menuitem" onClick={signOut} className={ITEM}>
            <LogOut aria-hidden className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
