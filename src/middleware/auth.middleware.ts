import type { RequestHandler } from 'express';
import type { UserRole } from '../common/constants/auth.constants.js';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { AppError } from '../common/errors/app-error.js';

/** Identity extracted from a verified access token. Set on `req.user` by requireAuth. */
export interface AuthUser {
  id: number;
  role: UserRole;
}

/**
 * Verifies a Bearer token and returns its identity claims. The real verifier
 * (JWT) is registered by the auth module via configureTokenVerifier — until
 * then every authenticated route rejects cleanly instead of trusting input
 * (the legacy app set sessions from request fields; see bug B-06).
 */
export type TokenVerifier = (token: string) => AuthUser | Promise<AuthUser>;

let tokenVerifier: TokenVerifier = () => {
  throw new AppError(
    HTTP_STATUS.UNAUTHORIZED,
    ERROR_CODES.UNAUTHORIZED,
    'Token verification is not configured yet',
  );
};

export function configureTokenVerifier(verifier: TokenVerifier): void {
  tokenVerifier = verifier;
}

/** Requires a valid `Authorization: Bearer <token>` and sets `req.user`. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.get('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  if (!token) {
    next(AppError.unauthorized());
    return;
  }
  try {
    req.user = await tokenVerifier(token);
    next();
  } catch (error) {
    next(error instanceof AppError ? error : AppError.unauthorized('Invalid or expired token'));
  }
};

/** Requires an authenticated user with one of the given roles (e.g. requireRole(USER_ROLES.ADMIN)). */
export function requireRole(...roles: readonly UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden());
      return;
    }
    next();
  };
}
