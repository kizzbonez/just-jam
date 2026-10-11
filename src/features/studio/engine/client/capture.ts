import { CHANNELS, SAMPLE_RATE } from "@/features/studio/audio-profile";

export interface AudioDevice {
  id: string;
  label: string;
}

export interface DeviceList {
  inputs: AudioDevice[];
  outputs: AudioDevice[];
  /** False until the browser has been granted access, when labels are blank. */
  labelled: boolean;
}

/**
 * Opens an input with every speech-oriented stage switched off. Echo
 * cancellation, noise suppression and automatic gain are built for voices in
 * rooms; on an instrument they gate, pump and colour the signal.
 */
export function openInput(deviceId: string | null): Promise<MediaStream> {
  const audio: MediaTrackConstraints & { latency: number } = {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    latency: 0,
    channelCount: CHANNELS,
    sampleRate: SAMPLE_RATE,
  };
  if (deviceId) audio.deviceId = { exact: deviceId };
  return navigator.mediaDevices.getUserMedia({ audio, video: false });
}

/** Explains a getUserMedia failure in terms the player can act on. */
export function describeInputError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") {
    return "The browser blocked access to audio input. Allow it for this site and try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "That input is not available. It may be unplugged or in use by another app.";
  }
  if (name === "NotReadableError") {
    return "The input could not be opened. Another application may be using it exclusively.";
  }
  return "Could not open the audio input.";
}

function toDevices(all: MediaDeviceInfo[], kind: MediaDeviceKind, fallback: string) {
  return all
    .filter((device) => device.kind === kind && device.deviceId !== "")
    .map((device, index) => ({
      id: device.deviceId,
      label: device.label || `${fallback} ${index + 1}`,
    }));
}

export async function listDevices(): Promise<DeviceList> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return {
    inputs: toDevices(all, "audioinput", "Input"),
    outputs: toDevices(all, "audiooutput", "Output"),
    labelled: all.some((device) => device.kind === "audioinput" && device.label !== ""),
  };
}

/** Capture latency the browser reports for a track, in ms. 0 when unknown. */
export function inputLatencyMs(stream: MediaStream): number {
  const settings = stream.getAudioTracks()[0]?.getSettings() as
    | (MediaTrackSettings & { latency?: number })
    | undefined;
  return Math.round((settings?.latency ?? 0) * 1000 * 10) / 10;
}
