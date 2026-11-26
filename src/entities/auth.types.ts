import type { RegistrableRole, UserRole } from '../common/constants/auth.constants.js';

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'deleted';

/** Validated body of POST /auth/register. */
export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  sex: 'male' | 'female';
  /** ISO date `YYYY-MM-DD`; must be 18+. */
  dob: string;
  /** Two-letter country code, must exist in `countries`. */
  countryCode: string;
  role: RegistrableRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Validated body of POST /auth/social. Provider set grows per phase. */
export interface SocialLoginInput {
  provider: 'google';
  /** Signed credential issued by the provider (Google id_token JWT). */
  idToken: string;
  role: RegistrableRole;
}

/** Normalized identity claims after the provider token is verified server-side. */
export interface SocialProfile {
  /** Provider's stable user id (Google `sub`). */
  providerUserId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
}

/** User row mapped off the legacy columns. */
export interface UserRecord {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
}

/** Safe user shape returned to clients (no hash, no internals). */
export interface PublicUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: AccountStatus;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires — null when tokens do not expire. */
  accessTokenExpiresIn: number | null;
}

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

export type AuthTokenType = 'activation' | 'password_reset';
