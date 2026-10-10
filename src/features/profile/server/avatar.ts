import "server-only";
import { db } from "@/lib/db";
import { badRequest, notFound } from "@/lib/http/errors";

export const MAX_AVATAR_BYTES = 200 * 1024;

const startsWith = (data: Uint8Array, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => data[offset + index] === byte);

/**
 * Identifies the image by its leading bytes. The declared content type is
 * ignored, and anything that is not a plain raster image is refused.
 */
export function sniffImage(data: Uint8Array): string | null {
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  const riff = startsWith(data, [0x52, 0x49, 0x46, 0x46]);
  if (riff && startsWith(data, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export async function saveAvatar(userId: string, data: Uint8Array): Promise<number> {
  if (data.byteLength === 0 || data.byteLength > MAX_AVATAR_BYTES) {
    throw badRequest("The image must be 200 KB or smaller.");
  }
  const mime = sniffImage(data);
  if (!mime) throw badRequest("Use a JPEG, PNG or WebP image.");
  const user = await db.user.update({
    where: { id: userId },
    data: { avatar: Buffer.from(data), avatarMime: mime, avatarVersion: { increment: 1 } },
    select: { avatarVersion: true },
  });
  return user.avatarVersion;
}

export async function removeAvatar(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { avatar: null, avatarMime: null, avatarVersion: { increment: 1 } },
  });
}

export async function loadAvatar(userId: string): Promise<{ data: Uint8Array; mime: string }> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { avatar: true, avatarMime: true },
  });
  if (!row?.avatar || !row.avatarMime) throw notFound();
  return { data: row.avatar, mime: row.avatarMime };
}
