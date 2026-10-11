import type { ReactNode } from "react";
import {
  Callout,
  Code,
  List,
  P,
  Pre,
  Section,
  Spec,
  Steps,
  Strong,
  type SpecRow,
} from "@/features/docs/components/prose";

const ROUTES: SpecRow[] = [
  {
    name: "Direct (QUIC)",
    value: "UDP 4433",
    note: "Audio as unreliable datagrams, straight to the relay. The lowest and steadiest latency. Needs the relay's UDP port reachable from each player.",
  },
  {
    name: "Fallback (WebSocket)",
    value: "HTTPS",
    note: "The same packets over TCP, through any reverse proxy or tunnel. Works from every network. Latency is whatever that detour costs, and a lost packet delays the ones behind it.",
  },
];

const DIRECT_ENV = `APP_URL=https://studio.example.com
ALLOWED_ORIGINS=http://127.0.0.1:3410
RELAY_PUBLIC_URL=https://relay.example.com:4433
RELAY_CERT_HOSTS=relay.example.com
RELAY_BIND=0.0.0.0`;

const DIRECT_STEPS: ReactNode[] = [
  <>
    Create a DNS record <Code>relay.example.com</Code> that resolves straight to the machine
    running the relay. It must not be proxied.
  </>,
  "Forward UDP port 4433 from your router or firewall to that machine.",
  <>
    Put the values below in <Code>.env</Code> and run <Code>docker compose up -d</Code>.
  </>,
  "Open a room from a second network, such as a phone hotspot. The badge beside the room name should read QUIC.",
];

const FALLBACK_ENV = `RELAY_WS_URL=wss://relay.example.com
RELAY_WS_PORT=4434`;

const FALLBACK_STEPS: ReactNode[] = [
  <>
    Point a tunnel route or reverse proxy for <Code>relay.example.com</Code> at{" "}
    <Code>http://127.0.0.1:4434</Code> (from a tunnel container:{" "}
    <Code>http://host.docker.internal:4434</Code>). The service type is plain HTTP, not HTTPS.
  </>,
  <>
    Set <Code>RELAY_WS_URL</Code> in <Code>.env</Code> and run <Code>docker compose up -d</Code>.
  </>,
  <>
    Run <Code>node e2e/ws-probe.mjs</Code>. It connects through the public address and prints the
    round trip, which is the figure that decides whether the fallback is good enough to play on.
  </>,
];

function DirectRoute() {
  return (
    <>
      <P>
        <Strong>The direct route.</Strong> The relay issues its own certificate, valid for 13 days
        and renewed every six, and hands its fingerprint to each browser with the room ticket, so
        no certificate authority is involved. To use a CA-issued certificate instead, set{" "}
        <Code>TLS_CERT_FILE</Code> and <Code>TLS_KEY_FILE</Code> on the relay.
      </P>
      <Steps items={DIRECT_STEPS} />
      <Pre>{DIRECT_ENV}</Pre>
    </>
  );
}

function FallbackRoute() {
  return (
    <>
      <P>
        <Strong>The fallback route.</Strong> The relay also listens for WebSocket connections on
        localhost. Nothing has to be opened on your router: a tunnel reaches it from inside.
      </P>
      <Steps items={FALLBACK_STEPS} />
      <Pre>{FALLBACK_ENV}</Pre>
      <Callout tone="warn" title="Measure the fallback before you rely on it">
        A tunnel sends audio to the provider&apos;s nearest data centre and back, and nearest is
        decided by your internet provider&apos;s routing, not by geography. A round trip of 20 ms
        is playable. One of 300 ms, which happens when traffic is carried to another continent, is
        fine for listening and talking but not for playing in time.
      </Callout>
    </>
  );
}

/** How players outside this machine reach the studio, and what each way costs. */
export function RemotePlay() {
  return (
    <Section id="remote" n="04" title="Playing with people elsewhere">
      <P>
        As shipped, only this computer can reach the studio. The web app needs HTTPS: put it behind
        a reverse proxy or tunnel pointed at <Code>http://127.0.0.1:3410</Code> and set{" "}
        <Code>APP_URL</Code> to the public address. The relay can then be reached in two ways, and
        you can offer both.
      </P>
      <Spec head={["Route", "Carried by", "What you get"]} rows={ROUTES} />
      <List
        items={[
          "Each browser tries the direct route first and uses the fallback if it does not answer within three seconds.",
          "Players on different routes can share a room. The badge beside the room name shows which one you are on.",
        ]}
      />
      <DirectRoute />
      <FallbackRoute />
    </Section>
  );
}
