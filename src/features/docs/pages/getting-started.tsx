import type { ReactNode } from "react";
import { Figure } from "@/features/docs/components/figure";
import { Callout, Lead, List, P, Section, Steps, Strong } from "@/features/docs/components/prose";
import { SignalPath } from "@/features/docs/components/signal-path";

const PRINCIPLES: ReactNode[] = [
  <>
    <Strong>Raw capture.</Strong> The interface is opened with echo cancellation, noise
    suppression and automatic gain switched off.
  </>,
  <>
    <Strong>Small frames.</Strong> Audio is cut into frames as short as 2.5 ms and each frame is
    sent the moment it is full.
  </>,
  <>
    <Strong>Datagrams over QUIC.</Strong> Frames travel as unreliable datagrams, so a lost packet
    is never retransmitted and never holds up the ones behind it.
  </>,
  <>
    <Strong>A jitter buffer you can see.</Strong> Each player you hear has their own small buffer,
    sized from how unevenly their packets actually arrive.
  </>,
];

const REQUIREMENTS: ReactNode[] = [
  "A current Chrome or Edge on a computer. The engine needs WebTransport, WebCodecs and AudioWorklet.",
  "An audio interface, or any input the browser can see. A built-in microphone works for a first test.",
  "Headphones. With speakers, the other players hear themselves coming back through your microphone.",
  "A wired network connection if you can. Wi-Fi adds jitter, and jitter is latency.",
];

const FIRST_ROOM: ReactNode[] = [
  <>
    In the <Strong>Lobby</Strong>, press <Strong>New room</Strong>. Give it a name, keep it private
    and add a PIN if you like.
  </>,
  <>
    You land on the room&apos;s entry screen. Press <Strong>Enter room</Strong>. That click is also
    what allows the browser to play sound.
  </>,
  <>
    In the <Strong>Interface</Strong> rack, press <Strong>Arm input</Strong> and allow access when
    the browser asks. Pick your interface from the list.
  </>,
  <>
    Play a note. The LED ladder and the scope should move. If only one of your two inputs carries
    signal, set <Strong>Channels</Strong> to mono from that input.
  </>,
  <>
    Press <Strong>Invite link</Strong> and send it to your band. Each player who joins gets a strip
    in your mixer.
  </>,
];

function HowItWorks() {
  return (
    <Section id="how" n="01" title="How it works">
      <P>
        Video-call technology is built for speech. It cancels echo, removes noise, levels the
        volume and hides network trouble by holding audio back, often 60 to 150 ms of it. All of
        that is wrong for an instrument. ToneLink skips that stack entirely and builds its own
        path from four browser features.
      </P>
      <SignalPath />
      <List items={PRINCIPLES} />
    </Section>
  );
}

function FirstRoom() {
  return (
    <Section id="first-room" n="03" title="Your first room">
      <Steps items={FIRST_ROOM} />
      <Figure
        shot="lobby"
        alt="The lobby listing the player's rooms with live player counts"
        caption="The lobby. The counter on each room shows who is connected right now."
      />
      <Callout title="Changes in the mixer are yours alone">
        Volume, pan and mute on a strip change only what you hear. Every player builds their own
        mix, and nothing you do there reaches the network.
      </Callout>
    </Section>
  );
}

export function GettingStarted() {
  return (
    <>
      <Lead>
        ToneLink QUIC lets musicians in different places play together from a browser. It sends
        the sound of your audio interface to the other players as fast as the network allows, and
        shows you exactly where every millisecond of delay comes from.
      </Lead>
      <Figure
        shot="console"
        alt="The studio console with two remote players, meters moving and telemetry running"
        caption="A live room: your interface on the left, the other players in the mixer, telemetry below."
      />
      <HowItWorks />
      <Section id="need" n="02" title="What you need">
        <List items={REQUIREMENTS} />
      </Section>
      <FirstRoom />
    </>
  );
}
