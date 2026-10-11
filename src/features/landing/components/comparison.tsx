import { Check, X } from "lucide-react";
import { SectionHeading } from "@/features/landing/components/section-heading";

const ROWS = [
  { stage: "Capture", call: "Echo cancelling, noise gate, automatic gain", ours: "All three off. The interface as it is" },
  { stage: "Framing", call: "20 ms packets", ours: "2.5, 5, 10 or 20 ms. You choose" },
  { stage: "Codec", call: "Opus tuned for voice", ours: "Opus in low-delay mode, or uncompressed PCM" },
  { stage: "Transport", call: "Retransmission, pacing, reordering", ours: "One datagram per frame, never resent, browser to browser" },
  { stage: "Buffer", call: "Hidden and cautious, 60 ms and up", ours: "Yours: adaptive or fixed, on a live trace" },
] as const;

/** Why a video call cannot be used for this, stage by stage. */
export function Comparison() {
  return (
    <section className="flex flex-col gap-8">
      <SectionHeading
        n="01"
        eyebrow="The problem"
        title="A video call is built for speech"
        lead="Everything it does to make a voice clear makes an instrument worse, and the delay it adds to hide the network makes playing in time impossible. ToneLink does not use that stack at all."
      />
      <div className="plate overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <thead>
            <tr>
              <th scope="col" className="silk w-36 border-b border-etch px-5 py-4">
                Stage
              </th>
              <th scope="col" className="silk border-b border-etch px-5 py-4">
                A video call
              </th>
              <th scope="col" className="silk border-b border-crimson-700 bg-wine-deep px-5 py-4 text-ink">
                ToneLink QUIC
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.stage} className="border-b border-etch/60 last:border-0">
                <th scope="row" className="px-5 py-4 align-top font-display text-lg font-semibold tracking-wide text-ink uppercase">
                  {row.stage}
                </th>
                <td className="px-5 py-4 align-top text-label">
                  <span className="flex gap-2.5">
                    <X aria-hidden className="mt-1 size-4 shrink-0 text-steel-600" />
                    {row.call}
                  </span>
                </td>
                <td className="bg-wine-deep/60 px-5 py-4 align-top text-ink">
                  <span className="flex gap-2.5">
                    <Check aria-hidden className="mt-1 size-4 shrink-0 text-crimson-500" />
                    {row.ours}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
