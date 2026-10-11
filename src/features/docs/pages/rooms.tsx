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

const OPTIONS: SpecRow[] = [
  {
    name: "Visibility",
    value: "Private, Public",
    note: "Private rooms are not listed anywhere and are reached only by their link. Public rooms appear in every member's lobby.",
  },
  {
    name: "PIN",
    value: "4 to 12 characters",
    note: "Optional. Everyone except the host must enter it. A correct PIN is remembered on that device for twelve hours.",
  },
  {
    name: "Players",
    value: "2 to 8",
    note: "Every player sends to every other player, directly or through the relay, so bandwidth grows with the size of the room.",
  },
];

const WAYS_IN: ReactNode[] = [
  <>
    Open the <Strong>invite link</Strong> the host sent. If you are not signed in, you are taken to
    the sign-in screen first and then on to the room.
  </>,
  <>
    Or paste the link or the id into the box beside <Strong>Join</Strong> in the lobby.
  </>,
  <>
    Public rooms are listed under <Strong>Open rooms</Strong> with their live player count.
  </>,
];

const HOST_POWERS: ReactNode[] = [
  <>
    <Strong>Remove a player.</Strong> The key with the crossed-out person on a channel strip
    disconnects that player and keeps them out of the room for six hours.
  </>,
  <>
    <Strong>Close the room.</Strong> In the lobby, <Strong>Close</Strong> ends the room for good
    and disconnects everyone in it. Its link stops working.
  </>,
];

function Creating() {
  return (
    <Section id="create" n="01" title="Creating a room">
      <Figure
        shot="create-room"
        alt="The New room dialog with name, visibility, PIN and player limit"
        caption="New room. A private room with a PIN is the usual choice for a band."
      />
      <Spec head={["Option", "Choices", "Effect"]} rows={OPTIONS} />
      <P>
        Room ids look like <Code>kqx-7m2d-pfa</Code>. They avoid look-alike characters so they can
        be read out over the phone. You can keep up to ten rooms open at once.
      </P>
    </Section>
  );
}

function Joining() {
  return (
    <Section id="join" n="02" title="Joining">
      <List items={WAYS_IN} />
      <Figure
        shot="room-gate"
        alt="The room entry screen asking for the room PIN"
        caption="The entry screen. Nothing is sent until you enter and arm your input."
      />
      <Callout title="One seat per player">
        Opening the same room in a second tab or on another device moves you there. The older
        connection is closed and told why, so you never appear twice.
      </Callout>
    </Section>
  );
}

export function Rooms() {
  return (
    <>
      <Lead>
        A room is a place to play, reached by a link. Whoever creates it is the host. Rooms stay
        open until the host closes them, so a band can keep one and come back to it.
      </Lead>
      <Creating />
      <Joining />
      <Section id="host" n="03" title="Host controls">
        <List items={HOST_POWERS} />
        <P>
          If the host leaves, the room carries on. Being host is about who may remove players and
          close the room, not about who has to be present.
        </P>
      </Section>
      <Section id="history" n="04" title="History">
        <P>
          <Strong>History</Strong> lists the rooms you have entered, most recent first, with a link
          back into any that are still open. One entry is recorded per sitting, not one per
          reconnect.
        </P>
      </Section>
    </>
  );
}
