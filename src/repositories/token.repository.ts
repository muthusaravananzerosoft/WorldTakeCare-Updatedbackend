import { databaseClient } from '../database/client.js';
import type { AuthTokenType } from '../entities/auth.types.js';

export interface RefreshTokenRow {
  id: number;
  userId: number;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface AuthTokenRow {
  id: number;
  userId: number;
  type: AuthTokenType;
  expiresAt: Date;
  usedAt: Date | null;
}

/**
 * Refresh and one-time tokens are stored as SHA-256 hashes only — the raw
 * token exists in the email link / client storage, never in the database.
 */
export interface TokenRepository {
  createRefreshToken(userId: number, tokenHash: string, expiresAt: Date): Promise<number>;
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null>;
  revokeRefreshToken(id: number): Promise<void>;
  revokeAllRefreshTokens(userId: number): Promise<void>;
  createAuthToken(
    userId: number,
    type: AuthTokenType,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  findAuthTokenByHash(tokenHash: string): Promise<AuthTokenRow | null>;
  markAuthTokenUsed(id: number): Promise<void>;
}

interface RefreshRow {
  id: number;
  user_id: number;
  expires_at: Date;
  revoked_at: Date | null;
}

interface AuthRow {
  id: number;
  user_id: number;
  type: AuthTokenType;
  expires_at: Date;
  used_at: Date | null;
}

export const tokenRepository: TokenRepository = {
  async createRefreshToken(userId, tokenHash, expiresAt) {
    const result = await databaseClient.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt],
    );
    return Number(result.insertId);
  },

  async findRefreshTokenByHash(tokenHash) {
    const rows = await databaseClient.query<RefreshRow>(
      'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ? LIMIT 1',
      [tokenHash],
    );
    const row = rows[0];
    return row
      ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at, revokedAt: row.revoked_at }
      : null;
  },

  async revokeRefreshToken(id) {
    await databaseClient.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL',
      [id],
    );
  },

  async revokeAllRefreshTokens(userId) {
    await databaseClient.execute(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId],
    );
  },

  async createAuthToken(userId, type, tokenHash, expiresAt) {
    await databaseClient.execute(
      'INSERT INTO auth_tokens (user_id, type, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [userId, type, tokenHash, expiresAt],
    );
  },

  async findAuthTokenByHash(tokenHash) {
    const rows = await databaseClient.query<AuthRow>(
      'SELECT id, user_id, type, expires_at, used_at FROM auth_tokens WHERE token_hash = ? LIMIT 1',
      [tokenHash],
    );
    const row = rows[0];
    return row
      ? {
          id: row.id,
          userId: row.user_id,
          type: row.type,
          expiresAt: row.expires_at,
          usedAt: row.used_at,
        }
      : null;
  },

  async markAuthTokenUsed(id) {
    await databaseClient.execute(
      'UPDATE auth_tokens SET used_at = NOW() WHERE id = ? AND used_at IS NULL',
      [id],
    );
  },
};
