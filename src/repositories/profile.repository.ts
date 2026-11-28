import { databaseClient, type MysqlTransactionContext } from '../database/client.js';
import { maritalStatusId, sexId, traitId } from '../common/constants/profile.constants.js';
import type {
  CountryRef,
  MemberDiscoveryFilters,
  MemberDiscoveryRow,
} from '../entities/profile.types.js';

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

/** PROFILE_SELECT row plus public-detail fields (username, online flag). */
export interface PublicMemberRow extends ProfileUserRow {
  use_id: number;
  username: string | null;
  /** 0/1 — row exists in online_users. */
  online: number;
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

export interface MemberDiscoveryPage {
  items: MemberDiscoveryRow[];
  totalItems: number;
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
  /**
   * Public member detail row — null when the user is missing, inactive,
   * deleted, suspended, hidden (marital_status 9) or not a member.
   */
  findPublicMemberRow(userId: number): Promise<PublicMemberRow | null>;
  /** Public member discovery page; guides, admins and hidden profiles excluded. */
  findDiscoveryPage(
    filters: MemberDiscoveryFilters,
    page: number,
    limit: number,
  ): Promise<MemberDiscoveryPage>;
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

const DISCOVERY_FROM = `FROM \`user\` u
  LEFT JOIN countries c1 ON c1.con_id = u.fadd1_con_id
  LEFT JOIN countries c2 ON c2.con_id = u.fadd2_con_id
  LEFT JOIN country_states s1 ON s1.sta_id = u.fadd1_sta_id
  LEFT JOIN country_states s2 ON s2.sta_id = u.fadd2_sta_id`;

function ageCutoffEpoch(years: number): number {
  const now = new Date();
  const year = now.getUTCFullYear() - years;
  const month = now.getUTCMonth();
  const day = Math.min(now.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return Math.floor(Date.UTC(year, month, day) / 1000);
}

function containsPattern(value: string): string {
  return `%${value.replace(/[!%_]/g, '!$&')}%`;
}

/**
 * Member-role clause shared by discovery and the public detail view —
 * role column wins; legacy rows may have role NULL so fall back to the
 * roles tinyint (1 = admin), mirroring mapRole() in user.repository.
 */
const MEMBER_ROLE_CLAUSE = `((u.role IN ('member', 'user') OR
       (u.role IS NULL AND COALESCE(u.roles, 3) <> 1))
       AND COALESCE(u.roles, 3) <> 1)`;

/**
 * Public member detail — PROFILE_SELECT plus the discovery visibility
 * rules (active, not deleted/suspended/hidden, member role) and the
 * online_users flag used for the "online" dot.
 */
const PUBLIC_MEMBER_SELECT = PROFILE_SELECT.replace(
  'SELECT u.fname,',
  'SELECT u.use_id, u.username, (o.is_member IS NOT NULL) AS online, u.fname,',
).replace(
  'WHERE u.use_id = ?',
  `LEFT JOIN online_users o ON o.is_member = u.use_id
   WHERE u.use_id = ?
     AND u.active = 1 AND u.isdel = 0 AND u.suspend = 0
     AND u.marital_status <> 9
     AND ${MEMBER_ROLE_CLAUSE}`,
);

function discoveryWhere(filters: MemberDiscoveryFilters) {
  const where = [
    'u.active = 1',
    'u.isdel = 0',
    'u.suspend = 0',
    'u.marital_status <> 9',
    "TRIM(u.fname) <> ''",
    "TRIM(u.lname) <> ''",
    MEMBER_ROLE_CLAUSE,
  ];
  const params: unknown[] = [];

  if (filters.q) {
    const pattern = containsPattern(filters.q);
    where.push(`(
      LOWER(u.fname) LIKE LOWER(?) ESCAPE '!' OR
      LOWER(u.lname) LIKE LOWER(?) ESCAPE '!' OR
      LOWER(CONCAT(u.fname, ' ', u.lname)) LIKE LOWER(?) ESCAPE '!'
    )`);
    params.push(pattern, pattern, pattern);
  }
  if (filters.ageMin !== undefined) {
    where.push('u.dob > 0 AND u.dob <= ?');
    params.push(ageCutoffEpoch(filters.ageMin));
  }
  if (filters.ageMax !== undefined) {
    where.push('u.dob > ?');
    params.push(ageCutoffEpoch(filters.ageMax + 1));
  }
  if (filters.gender) {
    where.push('u.sex = ?');
    params.push(sexId(filters.gender));
  }

  if (filters.countryCode || filters.stateId !== undefined || filters.city) {
    const locationBranches = [
      { country: 'c1.code', state: 'u.fadd1_sta_id', city: 'u.fadd1_cit_id' },
      { country: 'c2.code', state: 'u.fadd2_sta_id', city: 'u.fadd2_cit_id' },
    ].map((columns) => {
      const branch: string[] = [];
      if (filters.countryCode) {
        branch.push(`${columns.country} = ?`);
        params.push(filters.countryCode);
      }
      if (filters.stateId !== undefined) {
        branch.push(`${columns.state} = ?`);
        params.push(filters.stateId);
      }
      if (filters.city) {
        branch.push(`LOWER(${columns.city}) LIKE LOWER(?) ESCAPE '!'`);
        params.push(containsPattern(filters.city));
      }
      return `(${branch.join(' AND ')})`;
    });
    where.push(`(${locationBranches.join(' OR ')})`);
  }

  if (filters.language) {
    where.push(`FIND_IN_SET(LOWER(?), LOWER(REPLACE(u.languages, ', ', ','))) > 0`);
    params.push(filters.language);
  }
  if (filters.lookingToMeet) {
    if (filters.lookingToMeet === 'other') {
      where.push(
        `LOWER(TRIM(COALESCE(u.looking_to_meet, ''))) NOT IN ('', '0', 'man', 'woman', 'man or woman')`,
      );
    } else {
      const stored = {
        man: 'man',
        woman: 'woman',
        man_or_woman: 'man or woman',
      }[filters.lookingToMeet];
      where.push('LOWER(TRIM(u.looking_to_meet)) = ?');
      params.push(stored);
    }
  }
  if (filters.maritalStatus) {
    const statusId = maritalStatusId(filters.maritalStatus);
    if (statusId !== undefined) {
      where.push('u.marital_status = ?');
      params.push(statusId);
    }
  }
  if (filters.raceId !== undefined) {
    where.push('u.frac_id = ?');
    params.push(filters.raceId);
  }
  if (filters.religionId !== undefined) {
    where.push('u.reli_id = ?');
    params.push(filters.religionId);
  }
  if (filters.trait) {
    const profileTraitId = traitId(filters.trait);
    if (profileTraitId !== undefined) {
      where.push('FIND_IN_SET(?, u.`other`) > 0');
      params.push(profileTraitId);
    }
  }

  return { where: where.join(' AND '), params };
}

function discoveryOrderBy(sort: MemberDiscoveryFilters['sort']): string {
  switch (sort) {
    case 'newest':
      return 'CAST(NULLIF(u.registered, \'\') AS UNSIGNED) DESC, u.use_id DESC';
    case 'age_asc':
      return '(u.dob IS NULL OR u.dob <= 0) ASC, u.dob DESC, u.use_id ASC';
    case 'age_desc':
      return '(u.dob IS NULL OR u.dob <= 0) ASC, u.dob ASC, u.use_id ASC';
    default:
      return `(
        (u.profile_img IS NOT NULL AND TRIM(u.profile_img) <> '') +
        (u.img IS NOT NULL AND TRIM(u.img) <> '') +
        (u.dob IS NOT NULL AND u.dob > 0) +
        (u.sex IN (1, 2)) +
        (u.languages IS NOT NULL AND TRIM(u.languages) <> '') +
        (u.fadd1_con_id IS NOT NULL AND u.fadd1_con_id > 0)
      ) DESC, CAST(NULLIF(u.registered, '') AS UNSIGNED) DESC, u.use_id DESC`;
  }
}

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

  async findPublicMemberRow(userId) {
    const rows = await databaseClient.query<PublicMemberRow>(`${PUBLIC_MEMBER_SELECT} LIMIT 1`, [
      userId,
    ]);
    return rows[0] ?? null;
  },

  async findDiscoveryPage(filters, page, limit) {
    const { where, params } = discoveryWhere(filters);
    const countRows = await databaseClient.query<{ total: number }>(
      `SELECT COUNT(*) AS total ${DISCOVERY_FROM} WHERE ${where}`,
      params,
    );
    const offset = (page - 1) * limit;
    const items = await databaseClient.query<MemberDiscoveryRow>(
      `SELECT u.use_id, u.fname, u.lname, u.profile_img, u.img, u.sex, u.dob,
              u.marital_status, u.languages, u.\`other\`, u.looking_to_meet,
              CASE
                WHEN NULLIF(u.fadd1_con_id, 0) IS NOT NULL THEN u.fadd1_con_id
                ELSE NULLIF(u.fadd2_con_id, 0)
              END AS country_id,
              CASE
                WHEN NULLIF(u.fadd1_con_id, 0) IS NOT NULL THEN c1.code
                ELSE c2.code
              END AS country_code,
              CASE
                WHEN NULLIF(u.fadd1_con_id, 0) IS NOT NULL THEN c1.name
                ELSE c2.name
              END AS country_name,
              CASE
                WHEN NULLIF(u.fadd1_con_id, 0) IS NOT NULL THEN NULLIF(u.fadd1_sta_id, 0)
                ELSE NULLIF(u.fadd2_sta_id, 0)
              END AS state_id,
              CASE
                WHEN NULLIF(u.fadd1_con_id, 0) IS NOT NULL THEN s1.name
                ELSE s2.name
              END AS state_name,
              CASE
                WHEN NULLIF(u.fadd1_con_id, 0) IS NOT NULL THEN NULLIF(u.fadd1_cit_id, '')
                ELSE NULLIF(u.fadd2_cit_id, '')
              END AS city
         ${DISCOVERY_FROM}
        WHERE ${where}
        ORDER BY ${discoveryOrderBy(filters.sort)}
        LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { items, totalItems: Number(countRows[0]?.total ?? 0) };
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
