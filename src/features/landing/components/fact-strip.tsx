const FACTS = [
  { value: "2.5", unit: "ms", label: "Shortest frame", note: "Sent the moment it fills" },
  { value: "0", unit: "", label: "Retransmissions", note: "Late audio is worthless, so none is resent" },
  { value: "0.2", unit: "%", label: "Most the pitch ever moves", note: "While tracking sound-card drift" },
  { value: "3", unit: "", label: "Codecs", note: "Opus low-delay, PCM 16-bit, PCM 24-bit" },
] as const;

/** Four design facts about the engine, set as panel counters. */
export function FactStrip() {
  return (
    <dl className="plate grid grid-cols-2 divide-etch lg:grid-cols-4 lg:divide-x">
      {FACTS.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-2 p-5 sm:p-6">
          <dt className="silk">{fact.label}</dt>
          <dd className="flex flex-col gap-2">
            <span className="flex items-baseline gap-1.5">
              <span className="readout text-5xl leading-none text-ink">{fact.value}</span>
              {fact.unit && <span className="readout text-lg text-crimson-500">{fact.unit}</span>}
            </span>
            <span className="text-sm leading-snug text-label">{fact.note}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
