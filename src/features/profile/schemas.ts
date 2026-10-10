import { z } from "zod";
import { DisplayNameSchema } from "@/features/auth/schemas";
import {
  BITRATES_KBPS,
  BUFFER_MODES,
  CHANNEL_MODES,
  CODECS,
  fitsDatagram,
  FRAME_MICROS,
  MAX_BUFFER_MS,
  MIN_BUFFER_MS,
} from "@/features/studio/audio-profile";

export const INSTRUMENT_SUGGESTIONS = [
  "Lead Guitar",
  "Rhythm Guitar",
  "Bass",
  "Keys",
  "Synth",
  "Drums",
  "Vocals",
  "Sax",
] as const;

export const ProfileSchema = z.object({
  displayName: DisplayNameSchema,
  instrument: z.string().trim().min(2, "Use at least 2 characters.").max(24, "Use at most 24."),
});

const deviceId = z.string().max(256).nullable();

export const AudioProfileSchema = z
  .object({
    inputDeviceId: deviceId,
    inputLabel: z.string().max(200).nullable(),
    outputDeviceId: deviceId,
    channelMode: z.enum(CHANNEL_MODES),
    codec: z.enum(CODECS),
    frameMicros: z.union(FRAME_MICROS.map((value) => z.literal(value))),
    bitrateKbps: z.union(BITRATES_KBPS.map((value) => z.literal(value))),
    bufferMode: z.enum(BUFFER_MODES),
    bufferMs: z.number().int().min(MIN_BUFFER_MS).max(MAX_BUFFER_MS),
  })
  .refine(fitsDatagram, {
    path: ["frameMicros"],
    message: "That frame is too large for one datagram with this codec. Pick a shorter frame.",
  });

export type ProfileInput = z.infer<typeof ProfileSchema>;
