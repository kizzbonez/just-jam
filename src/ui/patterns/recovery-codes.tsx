import { CopyField } from "@/ui/patterns/copy-field";
import { Notice } from "@/ui/primitives/notice";

/** One-time display of freshly issued recovery codes. */
export function RecoveryCodes({ codes }: { codes: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Notice>
        Each code signs you in once if you lose your authenticator. They are shown only now, so
        store them somewhere safe.
      </Notice>
      <ul className="well readout grid grid-cols-1 gap-x-6 gap-y-2 border border-etch p-4 text-sm text-ink sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <CopyField value={codes.join("  ")} label="recovery codes" />
    </div>
  );
}
