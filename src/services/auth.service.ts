import { createHash, randomBytes } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { AppError } from '../common/errors/app-error.js';
import { env } from '../config/env.config.js';
import { mailSender } from '../integrations/mail/index.js';
import type { MailSender } from '../integrations/mail/mail-sender.interface.js';
import type {
  AuthResult,
  AuthTokenType,
  LoginInput,
  PublicUser,
  RegisterInput,
  TokenPair,
  UserRecord,
} from '../entities/auth.types.js';
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

export function createAuthService({ users, tokens, mail }: AuthServiceDeps) {
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
        subject: 'Activate your WorldTakeCare account',
        text: `Welcome ${user.firstName}! Activate your account: ${env.APP_BASE_URL}/api/v1/auth/activate?token=${token}`,
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
          subject: 'Activate your WorldTakeCare account',
          text: `Activate your account: ${env.APP_BASE_URL}/api/v1/auth/activate?token=${token}`,
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
          subject: 'Reset your WorldTakeCare password',
          text: `Reset your password: ${env.APP_BASE_URL}/reset-password?token=${token}`,
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
});
