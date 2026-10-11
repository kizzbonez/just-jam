import {
  Code,
  Lead,
  P,
  Section,
  Spec,
  Strong,
  type SpecRow,
} from "@/features/docs/components/prose";

const ENTERING: SpecRow[] = [
  {
    name: "Relay offline",
    value: "The web app cannot reach the relay",
    note: "Check that the relay container is running. The lobby hides player counts and rooms cannot be entered until it is back.",
  },
  {
    name: "Relay is set up for local use only",
    value: "The relay address is 127.0.0.1",
    note: "The web app was published but the relay was not. Publish the relay's UDP port, or set up the WebSocket fallback. See Self-hosting.",
  },
  {
    name: "Could not reach the audio relay",
    value: "Your browser cannot reach the relay",
    note: "UDP to the relay port is blocked or the address is wrong. Many office and hotel networks block UDP. Try another network.",
  },
  {
    name: "This browser lacks WebTransport",
    value: "Unsupported browser",
    note: "Use a current Chrome or Edge on a computer.",
  },
  {
    name: "This room is full",
    value: "Player limit reached",
    note: "The host can open a new room with a higher limit, up to 8.",
  },
  {
    name: "The host removed you",
    value: "Removed by the host",
    note: "You are kept out of that room for six hours.",
  },
  {
    name: "Joined from another tab",
    value: "Second connection",
    note: "The same account entered the room elsewhere. The newest connection wins.",
  },
];

const TRANSPORT_ROWS: SpecRow[] = [
  {
    name: "Badge reads WebSocket",
    value: "The fallback is in use",
    note: "This device could not reach the relay's UDP port, so audio is going over TCP through a proxy or tunnel. It works, with more delay.",
  },
  {
    name: "Relay RTT in the hundreds",
    value: "A long detour",
    note: "On the fallback, the round trip is the trip to the tunnel provider's data centre and back. It only slows players whose strip reads Relay; linked players bypass it.",
  },
  {
    name: "A strip reads Relay",
    value: "No link to that player",
    note: "Your two browsers could not reach each other directly, which is common on mobile data, strict firewalls and some VPNs. Their audio goes through the relay instead, with the relay's delay.",
  },
];

const INPUT: SpecRow[] = [
  {
    name: "Monitor sounds late or doubled",
    value: "Your own computer's delay",
    note: "The Monitor switch plays your input back through the browser, so you hear it after this computer's recording and playback delay, often 30 to 60 ms. Turn it off and use the direct monitoring on your audio interface.",
  },
  {
    name: "No interfaces listed",
    value: "No permission yet",
    note: "Browsers hide device names until access is granted. Press Arm input once and allow it.",
  },
  {
    name: "The browser blocked access",
    value: "Permission denied",
    note: "Allow the microphone for this site in the address bar, then arm again.",
  },
  {
    name: "The input could not be opened",
    value: "Device busy",
    note: "Another program has the interface in exclusive mode. Close it, or turn exclusive mode off in the system sound settings.",
  },
  {
    name: "Signal on one meter only",
    value: "One input in use",
    note: "Set Channels to mono from that input, or the others hear you on one side.",
  },
  { name: "Top segment stays white", value: "Clipping", note: "Turn the gain down on the interface." },
  {
    name: "Others hear themselves",
    value: "Speaker bleed",
    note: "Somebody is on speakers. Everyone should wear headphones.",
  },
];

const SOUND: SpecRow[] = [
  {
    name: "Dropouts climbing",
    value: "The buffer ran dry",
    note: "With adaptive tuning on it corrects itself within seconds. With a fixed buffer, raise it.",
  },
  {
    name: "Lateness p99 high",
    value: "Packets arrive unevenly",
    note: "Wi-Fi, a busy link or a busy computer at the sender's end. Use a cable and close other programs.",
  },
  {
    name: "Packet loss above 1%",
    value: "The link is dropping packets",
    note: "Lower the bitrate or switch from PCM to Opus. Lost packets are concealed but not recovered.",
  },
  {
    name: "Buffer held far above target",
    value: "A stall just ended",
    note: "The buffer drops the excess within about a third of a second.",
  },
  {
    name: "Latency high, buffer low",
    value: "Device delay dominates",
    note: "Look at the breakdown under the readouts. A large output figure points at your playback device or its driver.",
  },
];

const HEAD: [string, string, string] = ["You see", "Cause", "What to do"];

export function Troubleshooting() {
  return (
    <>
      <Lead>
        Most problems show up as one of a handful of messages or readings. Find yours below.
      </Lead>
      <Section id="entering" n="01" title="Getting in">
        <Spec head={HEAD} rows={ENTERING} />
      </Section>
      <Section id="route" n="02" title="The route to the relay">
        <Spec head={["Reading", "Meaning", "What to do"]} rows={TRANSPORT_ROWS} />
      </Section>
      <Section id="input" n="03" title="Your input">
        <Spec head={HEAD} rows={INPUT} />
      </Section>
      <Section id="sound" n="04" title="What you hear">
        <Spec head={["Reading", "Meaning", "What to do"]} rows={SOUND} />
      </Section>
      <Section id="report" n="05" title="Reporting a problem">
        <P>
          While a room is open, the browser console exposes a read-only snapshot of the session.
          Run <Code>copy(JSON.stringify(__tonelink.diagnostics(), null, 2))</Code> and paste the
          result into your report. It contains the readings from the console and your device
          names, and <Strong>no</Strong> passwords, tickets or audio.
        </P>
      </Section>
    </>
  );
}
