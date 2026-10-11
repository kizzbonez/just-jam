import type { ReactNode } from "react";
import { Figure } from "@/features/docs/components/figure";
import {
  Callout,
  Code,
  Lead,
  List,
  P,
  Section,
  Spec,
  Strong,
  type SpecRow,
} from "@/features/docs/components/prose";

const CONSTRAINTS: SpecRow[] = [
  {
    name: "echoCancellation",
    value: "false",
    note: "Echo cancellers subtract what they think is speaker bleed. On an instrument that is audible damage.",
  },
  {
    name: "noiseSuppression",
    value: "false",
    note: "Noise gates eat the tail of a note and the attack of the next.",
  },
  {
    name: "autoGainControl",
    value: "false",
    note: "Automatic gain flattens your dynamics and pumps between phrases.",
  },
  { name: "sampleRate", value: "48000", note: "The rate the whole path runs at. No resampling." },
  { name: "channelCount", value: "2", note: "Inputs 1 and 2 of the interface." },
  { name: "latency", value: "0", note: "Asks for the smallest capture buffer the driver offers." },
];

const ROUTING: SpecRow[] = [
  { name: "Stereo", value: "1 left, 2 right", note: "Keyboards, stereo effects, a stereo mic pair." },
  { name: "Mono from input 1", value: "1 to both sides", note: "One instrument or microphone on input 1." },
  { name: "Mono from input 2", value: "2 to both sides", note: "The same, on input 2." },
  { name: "Mono sum", value: "1 + 2, halved", note: "Two sources you want blended in the centre." },
];

const SWITCHES: ReactNode[] = [
  <>
    <Strong>Mute</Strong> stops your stream at the source. No packets leave while it is on, and the
    other players see your strip go quiet.
  </>,
  <>
    <Strong>Disarm</Strong> releases the interface completely, so another program can use it.
  </>,
  <>
    <Strong>Playback device</Strong> appears when the browser lets a page choose its output.
    Otherwise sound goes to the system default.
  </>,
];

function Capture() {
  return (
    <Section id="capture" n="01" title="What is captured">
      <P>
        When you arm an input, ToneLink asks the browser for the device exactly as it is: 48 kHz,
        two channels, with every speech-processing stage turned off.
      </P>
      <Spec head={["Constraint", "Value", "Why"]} rows={CONSTRAINTS} />
      <Callout title="Set the interface to 48 kHz">
        If the device runs at 44.1 kHz, the operating system resamples before the browser ever sees
        the audio, which costs quality and a little delay. Set it to 48 kHz in your interface&apos;s
        control panel or in the system sound settings.
      </Callout>
    </Section>
  );
}

function Routing() {
  return (
    <Section id="channels" n="02" title="Channel routing">
      <P>
        Most interfaces present two inputs as one stereo pair. A guitar plugged into input 1 then
        arrives on the left only. The <Strong>Channels</Strong> control fixes that before anything
        is sent.
      </P>
      <Spec head={["Setting", "Sends", "Use it for"]} rows={ROUTING} />
      <P>
        The two LED ladders always show the raw inputs, before routing, so you can see which socket
        carries signal.
      </P>
    </Section>
  );
}

function Monitoring() {
  return (
    <Section id="monitor" n="03" title="Hearing yourself">
      <P>
        Leave <Strong>Monitor</Strong> off and use your interface&apos;s direct monitoring, which
        has no delay. The Monitor switch routes your input back through the browser instead. It is
        there for interfaces without direct monitoring, and you will hear the round trip through
        the system&apos;s audio buffers.
      </P>
      <List items={SWITCHES} />
    </Section>
  );
}

function Level() {
  return (
    <Section id="level" n="04" title="Setting your level">
      <P>
        Aim for peaks in the upper third of the ladder. The top band lights brighter as you
        approach full scale, and the top segment latches white for two seconds when the signal
        clips. Set the gain on the interface itself: ToneLink sends what it is given and has no
        input gain of its own.
      </P>
      <P>
        Your settings are remembered. The interface, routing, codec and buffer choices you make in
        a room are saved a moment after you stop changing them and used the next time. You can also
        edit them under <Code>Profile &amp; audio</Code>.
      </P>
    </Section>
  );
}

export function AudioSetup() {
  return (
    <>
      <Lead>
        The Interface rack is your end of the room. It decides which hardware input is recorded,
        how its two channels are sent, and where you hear everyone else.
      </Lead>
      <Figure
        shot="interface"
        alt="The Interface rack with device pickers, level meters, a scope and the arm key"
        caption="The Interface rack while sending: meters for inputs 1 and 2 beside a live scope."
      />
      <Capture />
      <Routing />
      <Monitoring />
      <Level />
    </>
  );
}
