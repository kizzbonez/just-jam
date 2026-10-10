"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/ui/primitives/button";

/** A read-only value with a copy key, for links, tokens and codes. */
export function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-stretch gap-2">
      <output
        aria-label={label}
        className="well readout flex h-10 min-w-0 flex-1 items-center overflow-x-auto border border-etch px-3 text-sm whitespace-nowrap text-ink"
      >
        {value}
      </output>
      <Button
        onClick={copy}
        icon={copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
        aria-label={`Copy ${label}`}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
