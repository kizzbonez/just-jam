import type { ReactNode } from "react";
import { Figure } from "@/features/docs/components/figure";
import {
  Callout,
  Code,
  Lead,
  List,
  P,
  Pre,
  Section,
  Spec,
  Steps,
  Strong,
  type SpecRow,
} from "@/features/docs/components/prose";

const START = `npm run env:init            # writes .env with random secrets
docker compose up -d --build
docker compose logs web     # prints the one-time setup token`;

const UPDATE = `git pull
docker compose up -d --build   # migrations run before the web app starts`;

const SETUP_STEPS: ReactNode[] = [
  <>
    Open <Code>http://127.0.0.1:3410/setup</Code> and paste the token from the log. Only someone
    who can read that log can claim a new install.
  </>,
  "Create the owner account and choose who may register: invite only, open or closed.",
  "Pair an authenticator app. The owner account is created with two-factor already on.",
  "Save the recovery codes and, for an invite-only studio, the invite code.",
];

const SERVICES: SpecRow[] = [
  { name: "web", value: "127.0.0.1:3410 tcp", note: "Next.js app: pages, API, tickets. Runs read-only, as a non-root user." },
  { name: "relay", value: "127.0.0.1:4433 udp", note: "Go QUIC relay. Forwards audio datagrams, keeps no data. Its admin API is not published." },
  { name: "db", value: "none", note: "PostgreSQL on an internal network that only the web app can reach." },
  { name: "migrate", value: "none", note: "Runs once per start, applies database migrations, exits." },
];

const VARIABLES: SpecRow[] = [
  { name: "APP_URL", value: "http://127.0.0.1:3410", note: "The address people open. Use https here once it is behind TLS: it also turns on Secure cookies." },
  { name: "ALLOWED_ORIGINS", value: "http://localhost:3410", note: "Extra origins allowed to make changes and to connect to the relay, comma separated." },
  { name: "RELAY_PUBLIC_URL", value: "https://127.0.0.1:4433", note: "Where browsers reach the relay. Must be https and reachable over UDP." },
  { name: "RELAY_CERT_HOSTS", value: "127.0.0.1,localhost", note: "Names and addresses on the relay's self-signed certificate." },
  { name: "AUTH_SECRET", value: "generated", note: "Signs sessions and encrypts authenticator secrets. Changing it signs everyone out and breaks stored second factors." },
  { name: "RELAY_SHARED_SECRET", value: "generated", note: "Shared by web and relay. Signs room tickets." },
  { name: "SETUP_TOKEN", value: "empty", note: "Fix the first-run token instead of having a random one logged." },
  { name: "WEB_PORT / RELAY_PORT", value: "3410 / 4433", note: "Host ports. The web port is always bound to 127.0.0.1." },
  { name: "RELAY_BIND", value: "127.0.0.1", note: "Address the relay's UDP port is bound to. Set 0.0.0.0 to let other machines reach it." },
];

const REACHABLE: ReactNode[] = [
  <>
    <Strong>The web app over HTTPS.</Strong> Browsers allow microphone access and WebTransport
    only on a secure origin. Put it behind a reverse proxy or tunnel that terminates TLS, and set{" "}
    <Code>APP_URL</Code> to the public address.
  </>,
  <>
    <Strong>The relay over UDP.</Strong> WebTransport is HTTP/3, which is UDP only. Publish the
    relay&apos;s port on an address the players can reach, and set <Code>RELAY_PUBLIC_URL</Code>{" "}
    and <Code>RELAY_CERT_HOSTS</Code> to match.
  </>,
];

const PUBLIC_ENV = `APP_URL=https://studio.example.com
ALLOWED_ORIGINS=http://127.0.0.1:3410
RELAY_PUBLIC_URL=https://relay.example.com:4433
RELAY_CERT_HOSTS=relay.example.com
RELAY_BIND=0.0.0.0`;

const PUBLIC_STEPS: ReactNode[] = [
  <>
    Point your tunnel or reverse proxy for <Code>studio.example.com</Code> at{" "}
    <Code>http://127.0.0.1:3410</Code> (from a tunnel container:{" "}
    <Code>http://host.docker.internal:3410</Code>).
  </>,
  <>
    Create a DNS record <Code>relay.example.com</Code> that resolves straight to the machine
    running the relay. It must not be proxied.
  </>,
  "Forward UDP port 4433 from your router or firewall to that machine.",
  <>
    Put the values below in <Code>.env</Code> and run <Code>docker compose up -d</Code>.
  </>,
  "Open a room from a second network, such as a phone hotspot, and check that the console goes Live.",
];

const OPERATIONS: ReactNode[] = [
  <>
    All data is in the <Code>db-data</Code> volume. Back it up with{" "}
    <Code>docker compose exec db pg_dump -U tonelink tonelink</Code>.
  </>,
  "The relay holds rooms, seats and bans in memory. Restarting it disconnects everyone and clears bans; players simply rejoin.",
  <>
    <Code>npm run e2e</Code> runs two real browsers through a room and checks the audio that
    arrives. It expects a fresh stack with <Code>SETUP_TOKEN</Code> set.
  </>,
];

function Starting() {
  return (
    <Section id="start" n="01" title="Starting it">
      <Pre>{START}</Pre>
      <Steps items={SETUP_STEPS} />
      <Figure
        shot="setup"
        alt="The first-run setup wizard asking for the one-time setup token"
        caption="First-run setup. The token is printed once per start until an owner exists."
      />
    </Section>
  );
}

function Remote() {
  return (
    <Section id="remote" n="04" title="Playing with people elsewhere">
      <P>
        As shipped, only this computer can reach the studio. To play with others, two things have
        to be reachable from their browsers.
      </P>
      <List items={REACHABLE} />
      <Callout tone="warn" title="HTTP tunnels do not carry the relay">
        A tunnel or proxy that forwards HTTP over TCP, Cloudflare Tunnel included, can serve the
        web app but cannot carry the relay&apos;s UDP traffic. The relay needs a directly reachable
        UDP port: a forwarded port on your router, or a small server with a public address. For the
        lowest latency, run it near the players.
      </Callout>
      <P>
        The relay issues its own certificate, valid for 13 days and renewed every six, and hands
        its fingerprint to the web app, which gives it to each browser along with the room ticket.
        No certificate authority is involved. To use a CA-issued certificate instead, set{" "}
        <Code>TLS_CERT_FILE</Code> and <Code>TLS_KEY_FILE</Code> on the relay.
      </P>
      <Steps items={PUBLIC_STEPS} />
      <Pre>{PUBLIC_ENV}</Pre>
    </Section>
  );
}

export function SelfHosting() {
  return (
    <>
      <Lead>
        ToneLink runs as three containers: the web app, the QUIC relay and PostgreSQL. Out of the
        box every published port is bound to this machine only.
      </Lead>
      <Starting />
      <Section id="services" n="02" title="Services and ports">
        <Spec head={["Service", "Published", "Role"]} rows={SERVICES} />
      </Section>
      <Section id="env" n="03" title="Configuration">
        <P>
          Settings live in <Code>.env</Code>, created by <Code>npm run env:init</Code>. It is never
          overwritten once it exists.
        </P>
        <Spec head={["Variable", "Default", "Meaning"]} rows={VARIABLES} />
      </Section>
      <Remote />
      <Section id="operate" n="05" title="Updating and backing up">
        <Pre>{UPDATE}</Pre>
        <List items={OPERATIONS} />
      </Section>
    </>
  );
}
