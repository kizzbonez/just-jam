"use client";

import { useRouter } from "next/navigation";
import type { RoomTicket } from "@/features/rooms/server/issue-ticket";
import type { RoomDoor } from "@/features/rooms/server/room-queries";
import type { AudioProfile } from "@/features/studio/audio-profile";
import { BufferRack } from "@/features/studio/components/buffer-rack";
import { ClosedPanel } from "@/features/studio/components/closed-panel";
import { ConsoleHeader } from "@/features/studio/components/console-header";
import { InputRack } from "@/features/studio/components/input-rack";
import { MixerRack } from "@/features/studio/components/mixer-rack";
import { TelemetryRack } from "@/features/studio/components/telemetry-rack";
import { TransportRack } from "@/features/studio/components/transport-rack";
import { canRejoin } from "@/features/studio/engine/client/close-reasons";
import type { StudioEngine } from "@/features/studio/engine/client/engine";
import { useProfileSync } from "@/features/studio/hooks/use-profile-sync";
import { useRoomState, useStudioEngine } from "@/features/studio/hooks/use-studio-engine";
import { Skeleton } from "@/ui/patterns/skeleton";
import { Notice } from "@/ui/primitives/notice";

export interface StudioConsoleProps {
  door: RoomDoor;
  ticket: RoomTicket;
  profile: AudioProfile;
  /** Returns to the entry screen to request a fresh ticket. */
  onRejoin: () => void;
}

interface LiveConsoleProps {
  engine: StudioEngine;
  door: RoomDoor;
  onRejoin: () => void;
}

function LiveConsole({ engine, door, onRejoin }: LiveConsoleProps) {
  const router = useRouter();
  const state = useRoomState(engine);
  useProfileSync(state.profile);

  if (state.phase === "closed") {
    const rejoin = canRejoin(engine.closeCode) ? onRejoin : null;
    return <ClosedPanel reason={state.closeReason ?? "The session ended."} onRejoin={rejoin} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <ConsoleHeader door={door} state={state} onLeave={() => router.push("/lobby")} />
      {state.engineError && <Notice tone="error">{state.engineError}</Notice>}
      {state.transport === "websocket" && (
        <Notice>
          Connected through the WebSocket fallback. It works through any network, but it is TCP, so
          expect higher and less steady latency than a direct QUIC connection to the relay.
        </Notice>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-4">
          <InputRack engine={engine} state={state} />
          <TransportRack engine={engine} state={state} />
          <BufferRack engine={engine} state={state} />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-8">
          <MixerRack engine={engine} state={state} slug={door.slug} isHost={door.isHost} />
          <TelemetryRack engine={engine} state={state} />
        </div>
      </div>
    </div>
  );
}

/** The room after admission: starts the audio engine and renders the racks. */
export function StudioConsole({ door, ticket, profile, onRejoin }: StudioConsoleProps) {
  const { engine, startError } = useStudioEngine(ticket, profile);
  if (startError) return <Notice tone="error">{startError}</Notice>;
  if (!engine) return <Skeleton rows={5} />;
  return <LiveConsole engine={engine} door={door} onRejoin={onRejoin} />;
}
