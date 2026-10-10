import "server-only";
import { randomBytes } from "node:crypto";
import { RECOVERY_CODE_COUNT } from "@/features/auth/constants";
import type { Prisma } from "@/generated/prisma/client";
import { sha256Hex } from "@/lib/crypto/digest";
import { db } from "@/lib/db";

/** 64 random bits as `xxxx-xxxx-xxxx-xxxx`. */
function newCode(): string {
  const hex = randomBytes(8).toString("hex");
  return hex.match(/.{4}/g)!.join("-");
}

const normalize = (code: string) => code.trim().toLowerCase();

/** Replaces any existing codes. The plain codes are returned once and never stored. */
export async function issueRecoveryCodes(
  userId: string,
  tx: Prisma.TransactionClient = db,
): Promise<string[]> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newCode);
  await tx.recoveryCode.deleteMany({ where: { userId } });
  await tx.recoveryCode.createMany({
    data: codes.map((code) => ({ userId, codeHash: sha256Hex(code) })),
  });
  return codes;
}

/** Marks a matching unused code as spent. Returns false when there is none. */
export async function consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
  const spent = await db.recoveryCode.updateMany({
    where: { userId, codeHash: sha256Hex(normalize(code)), usedAt: null },
    data: { usedAt: new Date() },
  });
  return spent.count === 1;
}

export function countRecoveryCodes(userId: string): Promise<number> {
  return db.recoveryCode.count({ where: { userId, usedAt: null } });
}
