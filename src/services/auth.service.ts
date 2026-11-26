import { createHash, randomBytes } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { SignJWT, jwtVerify } from 'jose';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import type { RegistrableRole } from '../common/constants/auth.constants.js';
import { AppError } from '../common/errors/app-error.js';
import { appConfig } from '../config/app.config.js';
import { env } from '../config/env.config.js';
import { mailSender } from '../integrations/mail/index.js';
import type { MailSender } from '../integrations/mail/mail-sender.interface.js';
import type {
  AuthResult,
  AuthTokenType,
  LoginInput,
  OAuthProviderName,
  PublicUser,
  RegisterInput,
  SocialLoginInput,
  SocialProfile,
  TokenPair,
  UserRecord,
} from '../entities/auth.types.js';
import { googleVerifier } from '../integrations/social/google-verifier.js';
import {
  oauthProviders,
  pkceChallenge,
  type OAuthProviderRegistry,
} from '../integrations/social/oauth-providers.js';
import type { SocialTokenVerifier } from '../integrations/social/social-verifier.interface.js';
import {
  socialAccountRepository,
  type SocialAccountRepository,
} from '../repositories/social-account.repository.js';
import { tokenRepository, type TokenRepository } from '../repositories/token.repository.js';
import { userRepository, type UserRepository } from '../repositories/user.repository.js';
import { signAccessToken } from './jwt.service.js';

const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const LEGACY_MD5 = /^[0-9a-f]{32}$/i;

export interface AuthServiceDeps {
  users: UserRepository;
  tokens: TokenRepository;
  mail: MailSender;
  socials: SocialAccountRepository;
  verifier: SocialTokenVerifier;
  oauth: OAuthProviderRegistry;
}

const OAUTH_STATE_ISSUER = 'worldtaker-oauth';
const OAUTH_STATE_TTL = '10m';

function stateSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_ACCESS_SECRET);
}

function oauthCallbackUri(provider: OAuthProviderName): string {
  return `${env.APP_BASE_URL}${appConfig.apiPrefix}/auth/oauth/${provider}/callback`;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const randomToken = () => randomBytes(32).toString('hex');
const isLegacyMd5Hash = (stored: string) => LEGACY_MD5.test(stored);

function toPublic(user: UserRecord): PublicUser {
  const { id, email, firstName, lastName, role, status } = user;
  return { id, email, firstName, lastName, role, status };
}

function invalidCredentials(): AppError {
  // Same message for unknown email and wrong password — no enumeration.
  return new AppError(
    HTTP_STATUS.UNAUTHORIZED,
    ERROR_CODES.INVALID_CREDENTIALS,
    'Invalid email or password',
  );
}

function invalidToken(): AppError {
  return new AppError(
    HTTP_STATUS.BAD_REQUEST,
    ERROR_CODES.INVALID_TOKEN,
    'This link is invalid, already used or has expired',
  );
}

export function createAuthService({
  users,
  tokens,
  mail,
  socials,
  verifier,
  oauth,
}: AuthServiceDeps) {
  async function issueTokenPair(user: UserRecord): Promise<TokenPair> {
    const refreshToken = randomToken();
    await tokens.createRefreshToken(
      user.id,
      sha256(refreshToken),
      new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    );
    return {
      accessToken: await signAccessToken(user),
      refreshToken,
      accessTokenExpiresIn: env.ACCESS_TOKEN_TTL_MIN > 0 ? env.ACCESS_TOKEN_TTL_MIN * 60 : null,
    };
  }

  async function createOneTimeToken(userId: number, type: AuthTokenType, ttlMs: number) {
    const token = randomToken();
    await tokens.createAuthToken(userId, type, sha256(token), new Date(Date.now() + ttlMs));
    return token;
  }

  async function consumeAuthToken(rawToken: string, type: AuthTokenType): Promise<number> {
    const row = await tokens.findAuthTokenByHash(sha256(rawToken));
    if (!row || row.type !== type || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw invalidToken();
    }
    await tokens.markAuthTokenUsed(row.id);
    return row.userId;
  }

  function assertCanLogin(user: UserRecord): void {
    if (user.status === 'pending') {
      throw new AppError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.ACCOUNT_NOT_ACTIVATED,
        'Please activate your account using the link sent to your email',
      );
    }
    if (user.status === 'suspended' || user.status === 'deleted') {
      throw new AppError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.ACCOUNT_SUSPENDED,
        'This account is no longer active',
      );
    }
  }

  /** Legacy MD5 passwords verify once, then are upgraded to Argon2 transparently. */
  async function verifyPassword(user: UserRecord, password: string): Promise<boolean> {
    if (isLegacyMd5Hash(user.passwordHash)) {
      const matches = md5Hex(password) === user.passwordHash.toLowerCase();
      if (!matches) return false;
      await users.updatePassword(user.id, await argonHash(password));
      return true;
    }
    try {
      return await argonVerify(user.passwordHash, password);
    } catch {
      return false;
    }
  }

  /**
   * Shared tail of every social sign-in: the provider already delivered a
   * verified identity, so we resolve the account — provider link first, then
   * an existing email account to link, then a fresh social user — apply the
   * login guard rails and issue the normal token pair. Social-created
   * accounts skip email activation (the provider verified the address).
   */
  async function completeSocialLogin(
    provider: string,
    profile: SocialProfile,
    role: RegistrableRole,
    ip?: string,
  ): Promise<AuthResult> {
    if (profile.email && !profile.emailVerified) throw invalidCredentials();
    // X often returns no email — a deterministic placeholder keeps the
    // account unique while staying clearly internal-only.
    const email = profile.email ?? `${profile.providerUserId}@${provider}.oauth.local`;

    let user: UserRecord | null = null;
    const linkedId = await socials.findUserId(provider, profile.providerUserId);
    if (linkedId) user = await users.findById(linkedId);

    if (!user) {
      const existing = await users.findByEmail(email);
      if (existing) {
        // Email/password account — link the provider, keep its original role.
        await socials.link(existing.id, provider, profile.providerUserId, {
          firstName: existing.firstName,
          lastName: existing.lastName,
          email: existing.email,
        });
        user = existing;
      } else {
        user = await users.createSocial({
          email,
          firstName: profile.firstName.slice(0, 30) || 'Member',
          lastName: profile.lastName.slice(0, 30),
          providerUserId: profile.providerUserId,
          role,
          registeredIp: ip ?? null,
        });
        await socials.link(user.id, provider, profile.providerUserId, {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        });
      }
    }

    assertCanLogin(user);
    await users.touchLastLogin(user.id);
    return { user: toPublic(user), tokens: await issueTokenPair(user) };
  }

  return {
    async register(input: RegisterInput, ip?: string) {
      if (await users.findByEmail(input.email)) {
        throw new AppError(
          HTTP_STATUS.CONFLICT,
          ERROR_CODES.EMAIL_TAKEN,
          'An account with this email already exists',
        );
      }
      const countryId = await users.findCountryIdByCode(input.countryCode);
      if (!countryId) {
        throw new AppError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          'Validation failed',
          [{ location: 'body', path: 'countryCode', message: 'Unknown country code' }],
        );
      }
      const user = await users.create({
        email: input.email,
        passwordHash: await argonHash(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        sexCode: input.sex === 'male' ? 1 : 2,
        dobEpoch: Math.floor(new Date(input.dob).getTime() / 1000),
        countryId,
        role: input.role,
        registeredIp: ip ?? null,
      });
      const token = await createOneTimeToken(user.id, 'activation', ACTIVATION_TOKEN_TTL_MS);
      await mail.send({
        to: user.email,
        subject: 'Activate your WorldTaker account',
        text: `Welcome ${user.firstName}! Activate your account: ${env.WEB_APP_URL}/activate/?token=${token}`,
      });
      return {
        message: 'Registration successful. Please check your email to activate your account.',
      };
    },

    async activate(rawToken: string) {
      const userId = await consumeAuthToken(rawToken, 'activation');
      await users.setActive(userId);
      const user = await users.findById(userId);
      if (!user) throw AppError.notFound('User not found');
      // Authentication starts at activation — issue the token pair immediately.
      return {
        message: 'Account activated. You are now logged in.',
        user: toPublic(user),
        tokens: await issueTokenPair(user),
      };
    },

    async resendActivation(email: string) {
      const user = await users.findByEmail(email);
      if (user?.status === 'pending') {
        const token = await createOneTimeToken(user.id, 'activation', ACTIVATION_TOKEN_TTL_MS);
        await mail.send({
          to: user.email,
          subject: 'Activate your WorldTaker account',
          text: `Activate your account: ${env.WEB_APP_URL}/activate/?token=${token}`,
        });
      }
      // Always identical — the caller cannot learn whether the email exists.
      return { message: 'If the account exists and is pending, a new activation link was sent.' };
    },

    async login(input: LoginInput): Promise<AuthResult> {
      const user = await users.findByEmail(input.email);
      if (!user || !(await verifyPassword(user, input.password))) throw invalidCredentials();
      assertCanLogin(user);
      await users.touchLastLogin(user.id);
      return { user: toPublic(user), tokens: await issueTokenPair(user) };
    },

    /**
     * Social sign-in (POST /auth/social). The provider's signed id token is
     * verified server-side; the account is then found by the provider link,
     * linked to an existing email account, or created — mirroring the legacy
     * social-login.php flow but on user_social_login + user.provider_id.
     * Social-created accounts skip email activation (the provider already
     * verified the address).
     */
    async socialLogin(input: SocialLoginInput, ip?: string): Promise<AuthResult> {
      const profile = await verifier.verify(input.provider, input.idToken);
      return completeSocialLogin(input.provider, profile, input.role, ip);
    },

    /**
     * Server-side OAuth (Microsoft / Apple / X) — step 1. Returns the provider
     * consent URL plus a signed, 10-minute state cookie carrying a nonce, the
     * chosen role and the PKCE verifier (X only). The controller sets the
     * cookie httpOnly and 302s the browser to the URL.
     */
    async oauthStart(
      provider: OAuthProviderName,
      role: RegistrableRole,
    ): Promise<{ url: string; cookie: string }> {
      const impl = oauth[provider];
      const nonce = randomToken();
      const codeVerifier = impl.pkce ? randomBytes(48).toString('base64url') : undefined;
      const cookie = await new SignJWT({
        nonce,
        provider,
        role,
        ...(codeVerifier ? { cv: codeVerifier } : {}),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(OAUTH_STATE_ISSUER)
        .setExpirationTime(OAUTH_STATE_TTL)
        .sign(stateSecret());
      const url = impl.authorizeUrl({
        redirectUri: oauthCallbackUri(provider),
        state: nonce,
        codeChallenge: codeVerifier ? pkceChallenge(codeVerifier) : undefined,
      });
      return { url, cookie };
    },

    /**
     * Step 2 — the provider redirects here. Verifies the state cookie against
     * the query `state`, exchanges the code through the provider adapter and
     * finishes through the shared social-login flow.
     */
    async oauthCallback(
      provider: OAuthProviderName,
      params: {
        code?: string | undefined;
        state?: string | undefined;
        cookie?: string | undefined;
        userJson?: unknown;
        error?: string | undefined;
      },
      ip?: string,
    ): Promise<AuthResult> {
      const impl = oauth[provider];
      if (params.error) {
        throw new AppError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.OAUTH_DENIED,
          `${provider} sign-in was cancelled or denied`,
        );
      }
      if (!params.cookie) {
        throw AppError.badRequest('OAuth session is missing — start the sign-in again');
      }
      let claims;
      try {
        ({ payload: claims } = await jwtVerify(params.cookie, stateSecret(), {
          issuer: OAUTH_STATE_ISSUER,
        }));
      } catch {
        throw AppError.badRequest('OAuth session expired — start the sign-in again');
      }
      if (!params.state || claims.nonce !== params.state || claims.provider !== provider) {
        throw AppError.badRequest('Invalid OAuth state — start the sign-in again');
      }
      if (!params.code) {
        throw AppError.badRequest('Missing OAuth authorization code');
      }
      const role: RegistrableRole = claims.role === 'guide' ? 'guide' : 'member';
      const profile = await impl.exchange({
        code: params.code,
        redirectUri: oauthCallbackUri(provider),
        codeVerifier: typeof claims.cv === 'string' ? claims.cv : undefined,
        userJson: params.userJson,
      });
      return completeSocialLogin(provider, profile, role, ip);
    },

    async refresh(refreshToken: string): Promise<AuthResult> {
      const row = await tokens.findRefreshTokenByHash(sha256(refreshToken));
      if (!row) throw AppError.unauthorized('Invalid refresh token');
      if (row.revokedAt) {
        // A rotated-out token was presented again — treat as theft, kill the session.
        await tokens.revokeAllRefreshTokens(row.userId);
        throw AppError.unauthorized('Refresh token was already used — session revoked');
      }
      if (row.expiresAt.getTime() < Date.now()) {
        throw AppError.unauthorized('Refresh token expired');
      }
      const user = await users.findById(row.userId);
      if (!user) throw AppError.unauthorized('Invalid refresh token');
      assertCanLogin(user);
      await tokens.revokeRefreshToken(row.id);
      return { user: toPublic(user), tokens: await issueTokenPair(user) };
    },

    async logout(refreshToken: string) {
      const row = await tokens.findRefreshTokenByHash(sha256(refreshToken));
      if (row) await tokens.revokeRefreshToken(row.id);
      return { message: 'Logged out' };
    },

    async forgotPassword(email: string) {
      const user = await users.findByEmail(email);
      if (user && user.status === 'active') {
        const token = await createOneTimeToken(user.id, 'password_reset', RESET_TOKEN_TTL_MS);
        await mail.send({
          to: user.email,
          subject: 'Reset your WorldTaker password',
          text: `Reset your password: ${env.WEB_APP_URL}/reset-password/?token=${token}`,
        });
      }
      // Always identical — no email enumeration.
      return { message: 'If the email exists, a password reset link has been sent.' };
    },

    async resetPassword(rawToken: string, newPassword: string) {
      const userId = await consumeAuthToken(rawToken, 'password_reset');
      await users.updatePassword(userId, await argonHash(newPassword));
      await tokens.revokeAllRefreshTokens(userId);
      return { message: 'Password updated. Please log in again.' };
    },

    /**
     * Authenticated account save (legacy Account page): email + password in one call.
     * Verifies the current password, applies the email change when it differs,
     * then rotates every refresh token — other sessions die; the caller gets a
     * fresh pair so they stay logged in.
     */
    async changePassword(
      userId: number,
      email: string,
      currentPassword: string,
      newPassword: string,
    ): Promise<AuthResult & { message: string }> {
      const user = await users.findById(userId);
      if (!user || !(await verifyPassword(user, currentPassword))) {
        throw new AppError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.INVALID_CREDENTIALS,
          'Current password is incorrect',
        );
      }
      if (currentPassword === newPassword) {
        throw AppError.badRequest('New password must be different from the current password');
      }
      if (email !== user.email) {
        const existing = await users.findByEmail(email);
        if (existing && existing.id !== userId) {
          throw new AppError(
            HTTP_STATUS.CONFLICT,
            ERROR_CODES.EMAIL_TAKEN,
            'An account with this email already exists',
          );
        }
        await users.updateEmail(userId, email);
      }
      await users.updatePassword(userId, await argonHash(newPassword));
      await tokens.revokeAllRefreshTokens(userId);
      const updated = { ...user, email };
      return {
        message: 'Account updated.',
        user: toPublic(updated),
        tokens: await issueTokenPair(user),
      };
    },

    async getMe(userId: number): Promise<PublicUser> {
      const user = await users.findById(userId);
      if (!user) throw AppError.notFound('User not found');
      return toPublic(user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

function md5Hex(password: string): string {
  return createHash('md5').update(password).digest('hex');
}

export const authService = createAuthService({
  users: userRepository,
  tokens: tokenRepository,
  mail: mailSender,
  socials: socialAccountRepository,
  verifier: googleVerifier,
  oauth: oauthProviders,
});
