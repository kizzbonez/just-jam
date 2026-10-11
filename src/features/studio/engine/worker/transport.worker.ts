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

function handle(command: WorkerCommand): void {
  switch (command.t) {
    case "connect":
      link.connect(command).catch((error: unknown) => {
        fail(error);
        scope.postMessage({ t: "closed", code: null, reason: "Could not reach the audio relay." });
      });
      break;
    case "capture-port":
      link.setCapturePort(command.port);
      break;
    case "peer-port":
      link.addPeer(command.slot, command.port);
      break;
    case "profile":
      link.setProfile(command.profile).catch(fail);
      break;
    case "local":
      link.setLocal(command.state);
      break;
    case "kick":
      link.kick(command.slot);
      break;
    case "close":
      link.close();
      break;
  }
}

scope.onmessage = (event) => handle(event.data);
