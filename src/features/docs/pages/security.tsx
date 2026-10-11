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
  Steps,
  Strong,
} from "@/features/docs/components/prose";

const RESET_SQL = `docker compose exec db psql -U tonelink -d tonelink -c \\
  "UPDATE \\"User\\" SET \\"totpSecret\\" = NULL, \\"totpEnabledAt\\" = NULL,
   \\"totpLastCounter\\" = NULL WHERE email = 'you@example.com';"`;

const ENROL: ReactNode[] = [
  <>
    Open <Strong>Security</Strong> from the account menu and press{" "}
    <Strong>Set up authenticator</Strong>.
  </>,
  "Scan the code with an authenticator app, or type the key in by hand.",
  "Enter the 6-digit code the app shows. Two-factor turns on only once that first code is accepted, so a failed attempt leaves nothing half set up.",
  <>
    Save the eight <Strong>recovery codes</Strong> that appear. They are shown once.
  </>,
];

const CODE_RULES: ReactNode[] = [
  "Each recovery code signs you in once, in place of the 6-digit code.",
  "A 6-digit code cannot be used twice, even within its 30 seconds.",
  "You can issue a fresh set of recovery codes at any time. The old set stops working.",
  "The owner account always has two-factor on. It cannot be turned off there.",
];

const SIGN_IN: ReactNode[] = [
  <>
    <Strong>Lockout.</Strong> Five wrong passwords or codes lock the account for 15 minutes.
  </>,
  <>
    <Strong>Rate limits.</Strong> Sign-in, registration and setup are limited per address on top
    of that.
  </>,
  <>
    <Strong>Devices.</Strong> The Security page lists every device signed in to your account.{" "}
    <Strong>Sign out</Strong> beside one ends that session at once.
  </>,
  <>
    <Strong>Password change.</Strong> Changing your password signs out every other device.
  </>,
];

function TwoFactor() {
  return (
    <Section id="two-factor" n="01" title="Two-factor authentication">
      <Figure
        shot="security"
        alt="The Security page with two-factor, password and signed-in devices panels"
        caption="Security: second factor, password and every device signed in to the account."
      />
      <Steps items={ENROL} />
      <List items={CODE_RULES} />
    </Section>
  );
}

function LostAuthenticator() {
  return (
    <Section id="lost" n="04" title="If you lose your authenticator">
      <P>
        Sign in with a recovery code, then open <Strong>Security</Strong>. A member can turn
        two-factor off and set it up again on the new phone. If the recovery codes are gone too,
        whoever runs the server can clear the second factor directly in the database:
      </P>
      <Pre>{RESET_SQL}</Pre>
      <Callout tone="warn" title="Owner accounts">
        After this, the owner can sign in with the password alone but is sent straight to{" "}
        <Code>Security</Code> to enrol again before Studio settings will open.
      </Callout>
    </Section>
  );
}

export function Security() {
  return (
    <>
      <Lead>
        Nothing in the studio is served to someone who is not signed in: not a page, not an API
        route, not a screenshot in this guide. This page covers how accounts are protected and what
        to do when something is lost.
      </Lead>
      <TwoFactor />
      <Section id="sign-in" n="02" title="Sign-in protection">
        <List items={SIGN_IN} />
        <P>
          Passwords are stored as bcrypt hashes. Authenticator secrets are encrypted at rest, and
          recovery codes, invite codes and room PINs are stored only as hashes.
        </P>
      </Section>
      <Section id="rooms" n="03" title="Who can enter a room">
        <P>
          The relay admits only players holding a ticket, and the studio issues a ticket only after
          checking your session, the room and its PIN. A ticket is good for 60 seconds and for one
          room. The relay stamps every audio packet with the sender&apos;s seat itself, so a player
          cannot send audio as somebody else.
        </P>
        <Callout title="Linked players can see each other's network address">
          A link between two browsers is a direct, encrypted connection, so each of the two learns
          the other&apos;s public IP address, as in any peer-to-peer call. Each browser also asks a
          STUN server for its own address, by default ones run by Google and Cloudflare. Whoever
          runs the studio can set <Code>P2P_MODE=off</Code> to keep all audio on the relay, or
          choose other servers with <Code>P2P_STUN_URLS</Code>. Adding <Code>?p2p=off</Code> to a
          room&apos;s address keeps one browser off links.
        </Callout>
      </Section>
      <LostAuthenticator />
    </>
  );
}
