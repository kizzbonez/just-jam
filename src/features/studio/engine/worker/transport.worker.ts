/**
 * Transport worker entry point. Keeps WebTransport, WebCodecs and all packet
 * handling off the page's main thread, so rendering the UI can never delay or
 * glitch the audio path.
 */
import type { WorkerCommand, WorkerEvent } from "@/features/studio/engine/messages";
import { RoomLink } from "@/features/studio/engine/worker/room-link";

const scope = self as unknown as {
  postMessage(event: WorkerEvent): void;
  onmessage: ((event: MessageEvent<WorkerCommand>) => void) | null;
};

const link = new RoomLink((event) => scope.postMessage(event));

function fail(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  scope.postMessage({ t: "error", message });
}

type Handlers = {
  [K in WorkerCommand["t"]]: (command: Extract<WorkerCommand, { t: K }>) => void;
};

const handlers: Handlers = {
  connect: (command) => {
    link.connect(command).catch((error: unknown) => {
      fail(error);
      scope.postMessage({ t: "closed", code: null, reason: "Could not reach the audio relay." });
    });
  },
  "capture-port": (command) => link.setCapturePort(command.port),
  "peer-port": (command) => link.addPeer(command.slot, command.port),
  profile: (command) => {
    link.setProfile(command.profile).catch(fail);
  },
  local: (command) => link.setLocal(command.state),
  output: (command) => link.setOutputBlock(command.blockMs),
  kick: (command) => link.kick(command.slot),
  "p2p-channel": (command) => link.addLink(command.slot, command.channel),
  "p2p-close": (command) => link.removeLink(command.slot),
  signal: (command) => link.signal(command.slot, command.signal),
  close: () => link.close(),
};

scope.onmessage = (event) => {
  const command = event.data;
  (handlers[command.t] as (command: WorkerCommand) => void)(command);
};
