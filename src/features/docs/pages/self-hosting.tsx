import type { ReactNode } from "react";
import { Figure } from "@/features/docs/components/figure";
import {
  Code,
  Lead,
  List,
  P,
  Pre,
  Section,
  Spec,
  Steps,
  type SpecRow,
} from "@/features/docs/components/prose";
import { RemotePlay } from "@/features/docs/pages/self-hosting-remote";

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
  { name: "relay", value: "127.0.0.1:4433 udp, 127.0.0.1:4434 tcp", note: "Go relay. Forwards audio packets, keeps no data. UDP is the direct QUIC route, TCP the WebSocket fallback. Its admin API is not published." },
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
  { name: "RELAY_WS_URL", value: "empty", note: "Public wss:// address of the WebSocket fallback. Empty turns the fallback off." },
  { name: "RELAY_WS_PORT", value: "4434", note: "Host port of the fallback, always bound to 127.0.0.1. Point a tunnel or proxy at it." },
  { name: "P2P_MODE", value: "on", note: "Links between players' browsers. With on, browsers that can reach each other send audio straight to each other. off keeps all audio on the relay." },
  { name: "P2P_STUN_URLS", value: "Google, Cloudflare", note: "STUN servers a browser asks for its own public address, comma separated. none uses no server, which limits links to players on one network." },
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

export function SelfHosting() {
  return (
    <>
      <Lead>
        ToneLink runs as three containers: the web app, the relay and PostgreSQL. Out of the
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
      <RemotePlay />
      <Section id="operate" n="05" title="Updating and backing up">
        <Pre>{UPDATE}</Pre>
        <List items={OPERATIONS} />
      </Section>
    </>
  );
}
