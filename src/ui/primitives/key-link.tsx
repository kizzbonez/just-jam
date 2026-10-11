import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { keyClass, type KeySize, type KeyVariant } from "@/ui/primitives/button";

export interface KeyLinkProps {
  href: string;
  variant?: KeyVariant;
  size?: KeySize;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Navigation drawn as a panel key. Use Button for actions, this for going somewhere. */
export function KeyLink({ href, variant, size, icon, className, children }: KeyLinkProps) {
  const external = href.startsWith("http");
  return (
    <Link
      href={href}
      className={cn(keyClass(variant, size), className)}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {icon}
      {children}
    </Link>
  );
}
