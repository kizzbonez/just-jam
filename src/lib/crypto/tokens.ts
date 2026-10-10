import { jwtVerify, SignJWT, type JWTPayload } from "jose";

export interface TokenSpec {
  secret: string;
  audience: string;
}

export interface SignSpec extends TokenSpec {
  ttlSeconds: number;
}

const encode = (secret: string) => new TextEncoder().encode(secret);

export function signToken(claims: JWTPayload, spec: SignSpec): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setAudience(spec.audience)
    .setExpirationTime(`${spec.ttlSeconds}s`)
    .sign(encode(spec.secret));
}

/** Returns the claims, or null for any invalid, expired or mis-addressed token. */
export async function verifyToken<T extends JWTPayload>(
  token: string,
  spec: TokenSpec,
): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, encode(spec.secret), {
      audience: spec.audience,
      algorithms: ["HS256"],
    });
    return payload as T;
  } catch {
    return null;
  }
}
