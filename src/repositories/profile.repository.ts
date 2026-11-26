import { databaseClient, type MysqlTransactionContext } from '../database/client.js';
import type { CountryRef } from '../entities/profile.types.js';

/**
 * Persistence for the member profile across the legacy `user` columns,
 * `user_country_visited` and `user_visiting_country`. One save is a single
 * transaction — the three stores stay consistent.
 */

export interface ProfileUserRow {
  fname: string;
  lname: string;
  profile_img: string | null;
  /** Cover/avatar image shown on the profile page (users/{id}/avata/ in legacy). */
  img: string | null;
  sex: number;
  dob: number | null;
  marital_status: number;
  languages: string | null;
  other: string | null;
  looking_to_meet: string | null;
  /** `blob` columns — mysql2 returns Buffer. */
  write_something: string | Buffer | null;
  about: string | Buffer | null;
  fdob_con_id: number | null;
  frac_id: number | null;
  reli_id: number | null;
  other_religion: string | null;
  fhei_id: number | null;
  fedu_id: number | null;
  fdob_nationality_id: string | null;
  fadd1_con_id: number | null;
  fadd1_sta_id: number | null;
  fadd1_cit_id: string | null;
  fadd1_zip_id: string | null;
  fadd1_tmz_id: string | null;
  fadd2_con_id: number | null;
  fadd2_sta_id: number | null;
  fadd2_cit_id: string | null;
  fadd2_zip_id: string | null;
  fadd2_tmz_id: string | null;
  // joined display names / codes
  cob_code: string | null;
  cob_name: string | null;
  race_name: string | null;
  height_name: string | null;
  edu_name: string | null;
  p_con_code: string | null;
  p_con_name: string | null;
  p_sta_name: string | null;
  s_con_code: string | null;
  s_con_name: string | null;
  s_sta_name: string | null;
}

export interface VisitedRow {
  fcon_id: number;
  fsta_id: number;
  con_code: string | null;
  con_name: string;
  sta_name: string | null;
}

export interface VisitingRow {
  fcon1_id: number;
  fcon2_id: number;
  c1_code: string | null;
  c1_name: string | null;
  c2_code: string | null;
  c2_name: string | null;
}

export interface NewestMemberRow {
  use_id: number;
  username: string | null;
  fname: string;
  lname: string;
  profile_img: string | null;
  sex: number;
  dob: number | null;
  con_id: number | null;
  con_code: string | null;
  con_name: string | null;
  /** 0/1 — row exists in online_users. */
  online: number;
}

/** Writes for one save; absent/undefined sections are left untouched. */
export interface ProfileWrite {
  columns: Record<string, string | number | null>;
  visited?: { countryId: number; stateIds: number[] }[] | undefined;
  /** 0–2 country ids; empty array deletes the row. */
  visiting?: number[] | undefined;
}

export interface ProfileRepository {
  findProfileRow(userId: number): Promise<ProfileUserRow | null>;
  findCountriesByIds(ids: number[]): Promise<CountryRef[]>;
  findVisited(userId: number): Promise<VisitedRow[]>;
  findVisiting(userId: number): Promise<VisitingRow | null>;
  /** user UPDATE + visited replace + visiting upsert in one transaction. */
  saveProfile(userId: number, write: ProfileWrite): Promise<void>;
  /** Newest active members for the public homepage list (members only). */
  findNewestMembers(limit: number): Promise<NewestMemberRow[]>;
}

const PROFILE_SELECT = `SELECT u.fname, u.lname, u.profile_img, u.img, u.sex, u.dob, u.marital_status, u.languages, u.\`other\`,
       u.looking_to_meet, u.write_something, u.about,
       u.fdob_con_id, u.frac_id, u.reli_id, u.other_religion, u.fhei_id, u.fedu_id,
       u.fdob_nationality_id,
       u.fadd1_con_id, u.fadd1_sta_id, u.fadd1_cit_id, u.fadd1_zip_id, u.fadd1_tmz_id,
       u.fadd2_con_id, u.fadd2_sta_id, u.fadd2_cit_id, u.fadd2_zip_id, u.fadd2_tmz_id,
       cob.code AS cob_code, cob.name AS cob_name,
       r.name AS race_name, h.name AS height_name, e.name AS edu_name,
       c1.code AS p_con_code, c1.name AS p_con_name, s1.name AS p_sta_name,
       c2.code AS s_con_code, c2.name AS s_con_name, s2.name AS s_sta_name
  FROM \`user\` u
  LEFT JOIN countries cob ON cob.con_id = u.fdob_con_id
  LEFT JOIN race r ON r.rac_id = u.frac_id
  LEFT JOIN height h ON h.hei_id = u.fhei_id
  LEFT JOIN education_level e ON e.edu_id = u.fedu_id
  LEFT JOIN countries c1 ON c1.con_id = u.fadd1_con_id
  LEFT JOIN country_states s1 ON s1.sta_id = u.fadd1_sta_id
  LEFT JOIN countries c2 ON c2.con_id = u.fadd2_con_id
  LEFT JOIN country_states s2 ON s2.sta_id = u.fadd2_sta_id
  WHERE u.use_id = ?`;

export const profileRepository: ProfileRepository = {
  async findProfileRow(userId) {
    const rows = await databaseClient.query<ProfileUserRow>(`${PROFILE_SELECT} LIMIT 1`, [userId]);
    return rows[0] ?? null;
  },

  async findCountriesByIds(ids) {
    if (ids.length === 0) return [];
    const rows = await databaseClient.query<{ con_id: number; code: string | null; name: string }>(
      `SELECT con_id, code, name FROM countries WHERE con_id IN (${ids.map(() => '?').join(', ')})`,
      [...ids],
    );
    return rows.map((r) => ({ id: Number(r.con_id), code: r.code || null, name: r.name }));
  },

  async findVisited(userId) {
    return databaseClient.query<VisitedRow>(
      `SELECT vc.fcon_id, vc.fsta_id, c.code AS con_code, c.name AS con_name, s.name AS sta_name
         FROM user_country_visited vc
         JOIN countries c ON c.con_id = vc.fcon_id
         LEFT JOIN country_states s ON s.sta_id = vc.fsta_id AND vc.fsta_id <> 0
        WHERE vc.fuse_id = ?
        ORDER BY c.name ASC, s.name ASC`,
      [userId],
    );
  },

  async findVisiting(userId) {
    const rows = await databaseClient.query<VisitingRow>(
      `SELECT vc.fcon1_id, vc.fcon2_id,
              c1.code AS c1_code, c1.name AS c1_name,
              c2.code AS c2_code, c2.name AS c2_name
         FROM user_visiting_country vc
         LEFT JOIN countries c1 ON c1.con_id = vc.fcon1_id
         LEFT JOIN countries c2 ON c2.con_id = vc.fcon2_id
        WHERE vc.fuse_id = ? LIMIT 1`,
      [userId],
    );
    return rows[0] ?? null;
  },

  async findNewestMembers(limit) {
    // role column wins; legacy rows may have role NULL → fall back to the
    // roles tinyint (1 = admin), mirroring mapRole() in user.repository.
    return databaseClient.query<NewestMemberRow>(
      `SELECT u.use_id, u.username, u.fname, u.lname, u.profile_img, u.sex, u.dob,
              c.con_id, c.code AS con_code, c.name AS con_name,
              (o.is_member IS NOT NULL) AS online
         FROM \`user\` u
         LEFT JOIN countries c ON c.con_id = u.fdob_con_id
         LEFT JOIN online_users o ON o.is_member = u.use_id
        WHERE u.active = 1 AND u.isdel = 0 AND u.suspend = 0
          AND COALESCE(u.role, 'member') = 'member'
          AND (u.roles IS NULL OR u.roles <> 1)
        ORDER BY u.registered DESC
        LIMIT ?`,
      [limit],
    );
  },

  async saveProfile(userId, write) {
    return databaseClient.transaction(async (tx) => {
      const conn = (tx as MysqlTransactionContext).connection;

      const entries = Object.entries(write.columns);
      if (entries.length > 0) {
        await conn.execute(
          `UPDATE \`user\` SET ${entries.map(([col]) => `${col} = ?`).join(', ')} WHERE use_id = ?`,
          [...entries.map(([, v]) => v), userId],
        );
      }

      if (write.visited !== undefined) {
        await conn.execute('DELETE FROM user_country_visited WHERE fuse_id = ?', [userId]);
        for (const visited of write.visited) {
          await conn.execute(
            'INSERT INTO user_country_visited (fuse_id, fcon_id, fsta_id) VALUES (?, ?, 0)',
            [userId, visited.countryId],
          );
          for (const stateId of visited.stateIds) {
            await conn.execute(
              'INSERT INTO user_country_visited (fuse_id, fcon_id, fsta_id) VALUES (?, ?, ?)',
              [userId, visited.countryId, stateId],
            );
          }
        }
      }

      if (write.visiting !== undefined) {
        if (write.visiting.length === 0) {
          await conn.execute('DELETE FROM user_visiting_country WHERE fuse_id = ?', [userId]);
        } else {
          // user_visiting_country has no UNIQUE key on fuse_id — emulate the
          // legacy insert-or-update inside the same transaction.
          const [existingRaw] = await conn.query(
            'SELECT vc_id FROM user_visiting_country WHERE fuse_id = ? LIMIT 1',
            [userId],
          );
          const fcon1 = write.visiting[0] ?? 0;
          const fcon2 = write.visiting[1] ?? 0;
          if ((existingRaw as { vc_id: number }[]).length === 0) {
            await conn.execute(
              'INSERT INTO user_visiting_country (fuse_id, fcon1_id, fcon2_id) VALUES (?, ?, ?)',
              [userId, fcon1, fcon2],
            );
          } else {
            await conn.execute(
              'UPDATE user_visiting_country SET fcon1_id = ?, fcon2_id = ? WHERE fuse_id = ?',
              [fcon1, fcon2, userId],
            );
          }
        }
      }
    });
  },
};
