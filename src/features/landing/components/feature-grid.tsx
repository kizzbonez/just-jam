import { LandingShot } from "@/features/landing/components/landing-shot";
import { SectionHeading } from "@/features/landing/components/section-heading";

const FEATURES = [
  {
    shot: "mixer",
    alt: "The mixer with a channel strip for each remote player",
    title: "A strip for every player",
    text: "LED peak meter, volume fader, pan and mute per player. Your mix is yours alone, and none of it touches the network.",
  },
  {
    shot: "telemetry",
    alt: "Telemetry readouts above a one-minute trace of buffer and lateness",
    title: "Delay you can account for",
    text: "An interface-to-ears estimate split into capture, framing, network, buffer and output, with jitter, loss and dropouts beside it.",
  },
  {
    shot: "transport",
    alt: "Transport and jitter buffer settings",
    title: "Change it while you play",
    text: "Switch codec, frame size and bitrate mid-song. Let the buffer tune itself, or pin it and find the edge yourself.",
  },
  {
    shot: "lobby",
    alt: "The lobby listing rooms with live player counts",
    title: "A room is a link",
    text: "Private or public, with an optional PIN and a player limit. Send the link, and the host can remove a player or close the room.",
  },
] as const;

/** What the studio looks like, four screens at a time. */
export function FeatureGrid() {
  return (
    <section id="features" className="flex scroll-mt-20 flex-col gap-8">
      <SectionHeading
        n="03"
        eyebrow="The studio"
        title="Built like the gear on your desk"
        lead="Racks, strips, meters and switches instead of a settings page. Everything that decides how it sounds is on the panel."
      />
      <ul className="grid gap-5 md:grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature.shot} className="flex flex-col gap-4">
            <LandingShot name={feature.shot} alt={feature.alt} framed />
            <div className="flex flex-col gap-1.5 px-1">
              <h3 className="font-display text-2xl font-semibold tracking-wide text-ink uppercase">
                {feature.title}
              </h3>
              <p className="leading-relaxed text-label">{feature.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
