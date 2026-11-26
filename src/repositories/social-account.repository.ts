import { databaseClient, type MysqlTransactionContext } from '../database/client.js';

/**
 * Persistence for provider↔account links in the legacy `user_social_login`
 * table (sid, use_id, provider, profile_id, ...). Linking also stamps
 * `user.provider_id` — the legacy code keys social accounts on it directly.
 */

export interface SocialLinkInfo {
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface SocialAccountRepository {
  /** use_id linked to (provider, providerUserId), or null. Provider match is
   *  case-insensitive because legacy rows were stored as 'Google', 'Facebook'. */
  findUserId(provider: string, providerUserId: string): Promise<number | null>;
  /** Inserts the user_social_login row and fills user.provider_id when free. */
  link(userId: number, provider: string, providerUserId: string, info: SocialLinkInfo): Promise<void>;
}

export const socialAccountRepository: SocialAccountRepository = {
  async findUserId(provider, providerUserId) {
    const rows = await databaseClient.query<{ use_id: number }>(
      `SELECT use_id FROM user_social_login
        WHERE LOWER(provider) = LOWER(?) AND profile_id = ? AND use_id IS NOT NULL
        ORDER BY sid DESC LIMIT 1`,
      [provider, providerUserId],
    );
    return rows[0]?.use_id ?? null;
  },

  async link(userId, provider, providerUserId, info) {
    return databaseClient.transaction(async (tx) => {
      const conn = (tx as MysqlTransactionContext).connection;
      await conn.execute(
        `INSERT INTO user_social_login (use_id, provider, profile_id, firstName, lastName, provideremail)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, provider, providerUserId, info.firstName, info.lastName, info.email],
      );
      // Legacy keys the account on user.provider_id — fill it when not taken.
      await conn.execute(
        'UPDATE `user` SET provider_id = ? WHERE use_id = ? AND provider_id IS NULL',
        [providerUserId, userId],
      );
    });
  },
};
