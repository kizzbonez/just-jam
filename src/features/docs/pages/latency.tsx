import type { ReactNode } from "react";
import { Figure } from "@/features/docs/components/figure";
import {
  Callout,
  Lead,
  List,
  P,
  Section,
  Spec,
  Strong,
  type SpecRow,
} from "@/features/docs/components/prose";

const STAGES: SpecRow[] = [
  { name: "Capture", value: "3 to 10 ms", note: "The other player's interface and driver. Reported by their browser." },
  { name: "Framing", value: "1.25 to 12.5 ms", note: "Half a frame on average, plus 2.5 ms of lookahead for Opus. You choose the frame size." },
  { name: "Network", value: "distance", note: "Half of each player's round trip to the relay. Physics and routing." },
  { name: "Buffer", value: "5 to 40 ms", note: "Audio held to absorb uneven arrival. Tuned automatically, or fixed by you." },
  { name: "Output", value: "3 to 40 ms", note: "Your own playback device and driver. Reported by your browser." },
];

const CODECS: SpecRow[] = [
  { name: "Opus low-delay", value: "96 to 510 kbps", note: "The default. At 256 kbps stereo it is very hard to tell from the source, at a sixth of the data." },
  { name: "PCM 16-bit", value: "1536 kbps", note: "Uncompressed. Frames of 2.5 or 5 ms only, because a longer one will not fit a datagram." },
  { name: "PCM 24-bit", value: "2304 kbps", note: "Uncompressed, full resolution. 2.5 ms frames only." },
];

const TRADES: ReactNode[] = [
  <>
    <Strong>Shorter frames</Strong> lower latency and send more packets: 400 a second at 2.5 ms, 50
    a second at 20 ms.
  </>,
  <>
    <Strong>Uncompressed audio</Strong> removes the codec lookahead and any coding artefacts, and
    needs six to nine times the bandwidth, per player, in each direction.
  </>,
];

const BUFFER_BEHAVIOUR: ReactNode[] = [
  <>
    <Strong>Drift.</Strong> Two sound cards never run at exactly the same speed. The buffer
    corrects for it by playing up to 0.2% faster or slower, about 3.5 cents, and copies samples
    untouched whenever it is on target.
  </>,
  <>
    <Strong>Stalls.</Strong> If the network freezes and then delivers a pile of audio, the excess
    is dropped with a short crossfade so the delay does not stay high.
  </>,
  <>
    <Strong>Lost packets.</Strong> A missing packet is covered by a fading repeat of the audio
    before it.
  </>,
];

const TIPS: ReactNode[] = [
  "Use a wired connection. A steadier link lets the buffer shrink, usually the biggest single win.",
  "Close other programs that use the network or the audio device.",
  "Try a shorter frame. Going from 10 ms to 2.5 ms removes about 4 ms of framing delay.",
  "Check Lateness p99. If it is high while Relay RTT is low, the unevenness is on a computer, not the network.",
  "Check Packet loss. Persistent loss means the link cannot carry the bitrate: lower it, or leave PCM for Opus.",
  "Run the relay close to the players. Network delay is distance, and nothing in software removes it.",
];

function Sum() {
  return (
    <Section id="sum" n="01" title="Where the delay comes from">
      <Spec head={["Stage", "Typical", "What sets it"]} rows={STAGES} />
      <Callout title="The latency figure is an estimate">
        Capture and output delay are whatever each browser reports for its device, and some drivers
        buffer more than they admit. Treat the total as a good guide to what changed, not as a
        measurement made with a microphone.
      </Callout>
      <P>
        Players stay comfortably in time up to about 25 to 30 ms, roughly the delay of standing
        nine metres apart on a stage. Beyond that it takes practice, and a steady delay is far
        easier to play with than one that wanders.
      </P>
    </Section>
  );
}

function Transport() {
  return (
    <Section id="transport" n="02" title="Codec and frame size">
      <Figure
        shot="transport"
        alt="The Transport and Jitter buffer racks"
        caption="Transport and buffer settings can be changed while you play."
      />
      <Spec head={["Codec", "Bitrate", "Notes"]} rows={CODECS} />
      <P>
        Each frame is one datagram, and a datagram holds about 1200 bytes. That is why the
        uncompressed codecs are limited to short frames: the console disables any combination that
        would not fit, and shortens the frame for you when you switch codec.
      </P>
      <List items={TRADES} />
    </Section>
  );
}

function Buffer() {
  return (
    <Section id="buffer" n="03" title="The jitter buffer">
      <P>
        Packets leave at perfectly even intervals and arrive unevenly. The buffer holds a little
        audio so that a late packet is still in time. Too small and you hear dropouts; too large
        and you hear delay.
      </P>
      <P>
        With <Strong>Adaptive tuning</Strong> on, each player&apos;s buffer is sized from how late
        their packets really are: a structural minimum for the frame size, plus the lateness that
        99 in 100 recent packets stayed under, plus a margin. After a dropout it grows by a few
        milliseconds and then eases back over the following seconds. It rises at once and falls
        slowly, because a buffer that is briefly too large costs milliseconds and one that is too
        small is a gap in the music.
      </P>
      <P>
        Turn it off to set one <Strong>fixed size</Strong> for everyone. Lower it until the
        Dropouts counter starts to climb, then back off a few milliseconds.
      </P>
      <List items={BUFFER_BEHAVIOUR} />
    </Section>
  );
}

export function Latency() {
  return (
    <>
      <Lead>
        Latency is the sum of five delays. ToneLink shows each one, lets you trade the two you
        control, and tunes the third for you. This page explains what the numbers mean and what to
        change when they are too high.
      </Lead>
      <Figure
        shot="telemetry"
        alt="The Telemetry rack with latency, buffer and loss readouts above a one-minute trace"
        caption="Telemetry for one remote player. The trace shows buffer held, its target and packet lateness."
      />
      <Sum />
      <Transport />
      <Buffer />
      <Section id="lower" n="04" title="Getting it lower">
        <List items={TIPS} />
      </Section>
    </>
  );
}
