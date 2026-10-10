"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Frosted dialog built on the native element, so focus trapping and Esc come free. */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => event.target === ref.current && onClose()}
      className="glass m-auto w-[min(34rem,calc(100vw-2rem))] rounded-md p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <header className="etch-b flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="font-display text-xl font-semibold tracking-wide uppercase">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-[3px] p-1.5 text-label transition-colors hover:bg-carbon-800 hover:text-ink"
        >
          <X aria-hidden className="size-4.5" />
        </button>
      </header>
      <div className="p-5">{open && children}</div>
    </dialog>
  );
}
