import "server-only";
import type { ProfileInput } from "@/features/profile/schemas";
import { DEFAULT_PROFILE, type AudioProfile } from "@/features/studio/audio-profile";
import { db } from "@/lib/db";

export async function updateProfile(userId: string, input: ProfileInput): Promise<void> {
  await db.user.update({ where: { id: userId }, data: input });
}

export async function loadAudioProfile(userId: string): Promise<AudioProfile> {
  const row = await db.audioPreference.findUnique({ where: { userId } });
  if (!row) return DEFAULT_PROFILE;
  return {
    inputDeviceId: row.inputDeviceId,
    inputLabel: row.inputLabel,
    outputDeviceId: row.outputDeviceId,
    channelMode: row.channelMode,
    codec: row.codec,
    frameMicros: row.frameMicros as AudioProfile["frameMicros"],
    bitrateKbps: row.bitrateKbps,
    bufferMode: row.bufferMode,
    bufferMs: row.bufferMs,
  };
}

export async function saveAudioProfile(userId: string, profile: AudioProfile): Promise<void> {
  await db.audioPreference.upsert({
    where: { userId },
    create: { userId, ...profile },
    update: profile,
  });
}
