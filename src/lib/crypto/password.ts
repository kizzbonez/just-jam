import bcrypt from "bcryptjs";

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

let decoy: Promise<string> | undefined;

/**
 * Spends the same work as a real check when the account does not exist, so
 * response time does not reveal which emails are registered.
 */
export async function burnPasswordCheck(password: string): Promise<void> {
  decoy ??= hashPassword("tonelink-decoy-password");
  await verifyPassword(password, await decoy);
}
