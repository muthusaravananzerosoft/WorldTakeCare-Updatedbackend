import type { ResultSetHeader } from 'mysql2/promise';
import { databaseClient } from '../database/client.js';
import type { MysqlTransactionContext } from '../database/client.js';
import type {
  GuideProfilePatchInput,
  GuideProfileRecord,
  GuideProfileResult,
  HourlyRate,
  ProfileStatus,
  TourPreferences,
  VerificationStatus,
} from '../entities/guide-profile.types.js';

export interface GuideProfileRepository {
  /** Joined profile + user names — null when the guide has no profile yet. */
  findByUserId(userId: number): Promise<GuideProfileResult | null>;
  /**
   * Upsert in ONE transaction: writes provided firstName/lastName to `user`,
   * then inserts or updates only the profile fields present in `patch`
   * (null clears, [] clears an array column).
   */
  upsert(userId: number, patch: GuideProfilePatchInput): Promise<GuideProfileResult>;
  /** Sets/clears only cover_image_url, creating the profile row if needed. */
  setCoverImageUrl(userId: number, url: string | null): Promise<void>;
  /** Sets/clears only profile_image_url, creating the profile row if needed. */
  setProfileImageUrl(userId: number, url: string | null): Promise<void>;
}

interface GuideProfileRow {
  gp_id: number;
  user_id: number;
  headline: string | null;
  bio: string | null;
  base_city: string | null;
  country_code: string | null;
  guiding_areas: string | string[] | null;
  languages: string | string[] | null;
  years_of_experience: number | null;
  specialties: string | string[] | null;
  certification_title: string | null;
  tour_preferences: string | TourPreferences | null;
  hourly_rate: string | HourlyRate | null;
  contact_phone: string | null;
  website: string | null;
  cover_image_url: string | null;
  profile_image_url: string | null;
  verification_status: VerificationStatus;
  profile_status: ProfileStatus;
  created_at: Date;
  updated_at: Date;
}

type JoinedRow = GuideProfileRow & { fname: string; lname: string };

const SELECT_COLUMNS = `gp_id, user_id, headline, bio, base_city, country_code,
    guiding_areas, languages, years_of_experience, specialties,
    certification_title, tour_preferences, hourly_rate,
    contact_phone, website, cover_image_url, profile_image_url,
    verification_status, profile_status, created_at, updated_at`;

function parseJson<T>(raw: string | T | null): T | null {
  if (raw === null || raw === '') return null;
  return typeof raw === 'string' ? (JSON.parse(raw) as T) : raw;
}

function mapRow(row: GuideProfileRow): GuideProfileRecord {
  return {
    id: row.gp_id,
    userId: Number(row.user_id),
    headline: row.headline,
    bio: row.bio,
    baseCity: row.base_city,
    countryCode: row.country_code,
    guidingAreas: parseJson<string[]>(row.guiding_areas),
    languages: parseJson<string[]>(row.languages),
    yearsOfExperience: row.years_of_experience,
    specialties: parseJson<string[]>(row.specialties),
    certificationTitle: row.certification_title,
    tourPreferences: parseJson<TourPreferences>(row.tour_preferences),
    hourlyRate: parseJson<HourlyRate>(row.hourly_rate),
    contactPhone: row.contact_phone,
    website: row.website,
    coverImageUrl: row.cover_image_url,
    profileImageUrl: row.profile_image_url,
    verificationStatus: row.verification_status,
    profileStatus: row.profile_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapResult(row: JoinedRow): GuideProfileResult {
  const p = mapRow(row);
  return {
    firstName: row.fname,
    lastName: row.lname,
    headline: p.headline,
    bio: p.bio,
    baseCity: p.baseCity,
    countryCode: p.countryCode,
    guidingAreas: p.guidingAreas,
    languages: p.languages,
    yearsOfExperience: p.yearsOfExperience,
    specialties: p.specialties,
    certificationTitle: p.certificationTitle,
    tourPreferences: p.tourPreferences,
    hourlyRate: p.hourlyRate,
    contactPhone: p.contactPhone,
    website: p.website,
    coverImage: p.coverImageUrl === null ? null : { url: p.coverImageUrl },
    profileImage: p.profileImageUrl === null ? null : { url: p.profileImageUrl },
    verificationStatus: p.verificationStatus,
    profileStatus: p.profileStatus,
    updatedAt: p.updatedAt,
  };
}

const JSON_FIELDS = new Set([
  'guidingAreas',
  'languages',
  'specialties',
  'tourPreferences',
  'hourlyRate',
]);

const FIELD_TO_COLUMN: Record<string, string> = {
  headline: 'headline',
  bio: 'bio',
  baseCity: 'base_city',
  countryCode: 'country_code',
  guidingAreas: 'guiding_areas',
  languages: 'languages',
  yearsOfExperience: 'years_of_experience',
  specialties: 'specialties',
  certificationTitle: 'certification_title',
  tourPreferences: 'tour_preferences',
  hourlyRate: 'hourly_rate',
  contactPhone: 'contact_phone',
  website: 'website',
};

type SqlParam = string | number | null;

/** Provided fields → (column, sql value) pairs in a stable order. */
function buildSets(patch: GuideProfilePatchInput): { column: string; value: SqlParam }[] {
  const sets: { column: string; value: SqlParam }[] = [];
  for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
    if (!(field in patch)) continue;
    const value = (patch as Record<string, unknown>)[field];
    if (value === null || value === undefined) {
      sets.push({ column, value: null });
    } else if (JSON_FIELDS.has(field)) {
      const arr = Array.isArray(value) && value.length === 0 ? null : value;
      sets.push({ column, value: arr === null ? null : JSON.stringify(arr) });
    } else {
      sets.push({ column, value: value as string | number });
    }
  }
  return sets;
}

export const guideProfileRepository: GuideProfileRepository = {
  async findByUserId(userId) {
    const rows = await databaseClient.query<JoinedRow>(
      `SELECT p.${SELECT_COLUMNS.split(', ').join(', p.')}, u.fname, u.lname
         FROM guide_profiles p JOIN \`user\` u ON u.use_id = p.user_id
        WHERE p.user_id = ? LIMIT 1`,
      [userId],
    );
    const row = rows[0];
    return row ? mapResult(row) : null;
  },

  async upsert(userId, patch) {
    return databaseClient.transaction(async (tx) => {
      const conn = (tx as MysqlTransactionContext).connection;

      if (patch.firstName !== undefined || patch.lastName !== undefined) {
        const sets: string[] = [];
        const params: SqlParam[] = [];
        if (patch.firstName !== undefined) {
          sets.push('fname = ?');
          params.push(patch.firstName);
        }
        if (patch.lastName !== undefined) {
          sets.push('lname = ?');
          params.push(patch.lastName);
        }
        params.push(userId);
        await conn.execute(`UPDATE \`user\` SET ${sets.join(', ')} WHERE use_id = ?`, params);
      }

      const sets = buildSets(patch);
      const [existingRowsRaw] = await conn.query(
        'SELECT gp_id FROM guide_profiles WHERE user_id = ? LIMIT 1',
        [userId],
      );
      const existingRows = existingRowsRaw as GuideProfileRow[];

      if (existingRows.length === 0) {
        const [header] =
          sets.length === 0
            ? await conn.execute<ResultSetHeader>(
                'INSERT INTO guide_profiles (user_id) VALUES (?)',
                [userId],
              )
            : await conn.execute<ResultSetHeader>(
                `INSERT INTO guide_profiles (user_id, ${sets.map((s) => s.column).join(', ')})
                 VALUES (?, ${sets.map(() => '?').join(', ')})`,
                [userId, ...sets.map((s) => s.value)],
              );
        if (!header.insertId) throw new Error('Guide profile insert failed');
      } else if (sets.length > 0) {
        await conn.execute(
          `UPDATE guide_profiles SET ${sets.map((s) => `${s.column} = ?`).join(', ')}
            WHERE user_id = ?`,
          [...sets.map((s) => s.value), userId],
        );
      }

      const [rowsRaw] = await conn.query(
        `SELECT p.${SELECT_COLUMNS.split(', ').join(', p.')}, u.fname, u.lname
           FROM guide_profiles p JOIN \`user\` u ON u.use_id = p.user_id
          WHERE p.user_id = ? LIMIT 1`,
        [userId],
      );
      const rows = rowsRaw as JoinedRow[];
      if (!rows[0]) throw new Error('Guide profile write failed');
      return mapResult(rows[0]);
    });
  },

  async setCoverImageUrl(userId, url) {
    await databaseClient.execute(
      `INSERT INTO guide_profiles (user_id, cover_image_url) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE cover_image_url = VALUES(cover_image_url)`,
      [userId, url],
    );
  },

  async setProfileImageUrl(userId, url) {
    await databaseClient.execute(
      `INSERT INTO guide_profiles (user_id, profile_image_url) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE profile_image_url = VALUES(profile_image_url)`,
      [userId, url],
    );
  },
};
