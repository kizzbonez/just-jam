import type { ReactNode } from "react";
import { Brand } from "@/ui/rack/brand";
import { RackUnit } from "@/ui/rack/rack-unit";

export interface AuthFaceplateProps {
  label: string;
  code: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** The single rack module the sign-in, registration and setup screens live in. */
export function AuthFaceplate({ label, code, children, footer }: AuthFaceplateProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4 px-1">
        <Brand size="lg" />
        <span className="readout hidden text-[0.6875rem] text-steel-600 sm:block">
          HTTP/3 · DATAGRAM
        </span>
      </div>
      <RackUnit label={label} code={code} bodyClassName="p-5 sm:p-6">
        {children}
      </RackUnit>
      {footer && <div className="px-1 text-center text-sm text-label">{footer}</div>}
    </div>
  );
}
