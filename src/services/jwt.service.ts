import { SignJWT, jwtVerify } from 'jose';
import { USER_ROLES, type UserRole } from '../common/constants/auth.constants.js';
import { env } from '../config/env.config.js';
import type { AuthUser } from '../middleware/auth.middleware.js';

const ISSUER = 'worldtakecare-api';

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

/** Short-lived JWT — verified statelessly by requireAuth on every request. */
export async function signAccessToken(user: { id: number; role: UserRole }): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MIN}m`)
    .sign(secretKey());
}

/**
 * Registered with configureTokenVerifier() in server.ts — this is the seam the
 * auth middleware was built around. Throws on expired/invalid tokens; the
 * middleware maps that to 401.
 */
export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER });
  const role = payload.role;
  return {
    id: Number(payload.sub),
    role:
      role === USER_ROLES.ADMIN || role === USER_ROLES.GUIDE ? (role as UserRole) : USER_ROLES.USER,
  };
}
