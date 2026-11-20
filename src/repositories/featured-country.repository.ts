import { databaseClient } from '../database/client.js';
import type {
  FeaturedCountryInput,
  FeaturedCountryRecord,
  FeaturedCountryUpdateInput,
} from '../entities/featured-country.types.js';
import type { Page, PageRequest } from './repository.interface.js';

export interface FeaturedCountryRepository {
  create(input: FeaturedCountryInput): Promise<FeaturedCountryRecord>;
  /** Idempotent seed helper — inserts or replaces the row keyed by country_code. */
  upsertByCode(input: FeaturedCountryInput): Promise<FeaturedCountryRecord>;
  findById(id: number): Promise<FeaturedCountryRecord | null>;
  findByCode(code: string): Promise<FeaturedCountryRecord | null>;
  /** Public feed — active rows only, optional name search. */
  findPage(request: PageRequest, query?: string): Promise<Page<FeaturedCountryRecord>>;
  update(id: number, input: FeaturedCountryUpdateInput): Promise<FeaturedCountryRecord | null>;
  delete(id: number): Promise<boolean>;
}

interface FeaturedCountryRow {
  fc_id: number;
  country_name: string;
  country_code: string;
  description: string;
  /** LONGTEXT on MariaDB; parsed value on MySQL via mysql2. */
  keywords: string | string[];
  landmark_name: string;
  image_url: string | null;
  image_provider: string | null;
  image_id: string | null;
  photographer_name: string | null;
  photographer_url: string | null;
  image_source_url: string | null;
  display_order: number;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `fc_id, country_name, country_code, description, keywords,
    landmark_name, image_url, image_provider, image_id,
    photographer_name, photographer_url, image_source_url,
    display_order, is_active, created_at, updated_at`;

type SqlParam = string | number | null;

function parseKeywords(raw: FeaturedCountryRow['keywords']): string[] {
  if (typeof raw === 'string') return JSON.parse(raw) as string[];
  return Array.isArray(raw) ? raw : [];
}

function mapRow(row: FeaturedCountryRow): FeaturedCountryRecord {
  return {
    id: row.fc_id,
    countryName: row.country_name,
    countryCode: row.country_code,
    description: row.description,
    keywords: parseKeywords(row.keywords),
    landmarkName: row.landmark_name,
    imageUrl: row.image_url,
    imageProvider: row.image_provider,
    imageId: row.image_id,
    photographerName: row.photographer_name,
    photographerUrl: row.photographer_url,
    imageSourceUrl: row.image_source_url,
    displayOrder: row.display_order,
    isActive: !!row.is_active,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function params(input: FeaturedCountryInput): SqlParam[] {
  return [
    input.countryName,
    input.countryCode.toUpperCase(),
    input.description,
    JSON.stringify(input.keywords),
    input.landmarkName,
    input.imageUrl ?? null,
    input.imageProvider ?? null,
    input.imageId ?? null,
    input.photographerName ?? null,
    input.photographerUrl ?? null,
    input.imageSourceUrl ?? null,
    input.displayOrder,
    input.isActive ? 1 : 0,
  ];
}

const INSERT_SQL = `INSERT INTO featured_countries
    (country_name, country_code, description, keywords, landmark_name,
     image_url, image_provider, image_id, photographer_name,
     photographer_url, image_source_url, display_order, is_active)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const FIELD_TO_COLUMN: Record<string, string> = {
  countryName: 'country_name',
  countryCode: 'country_code',
  description: 'description',
  landmarkName: 'landmark_name',
  imageUrl: 'image_url',
  imageProvider: 'image_provider',
  imageId: 'image_id',
  photographerName: 'photographer_name',
  photographerUrl: 'photographer_url',
  imageSourceUrl: 'image_source_url',
  displayOrder: 'display_order',
};

export const featuredCountryRepository: FeaturedCountryRepository = {
  async create(input) {
    const result = await databaseClient.execute(INSERT_SQL, params(input));
    const record = await this.findById(Number(result.insertId));
    if (!record) throw new Error('Featured country insert failed');
    return record;
  },

  async upsertByCode(input) {
    await databaseClient.execute(
      `${INSERT_SQL}
       ON DUPLICATE KEY UPDATE
         country_name = VALUES(country_name), description = VALUES(description),
         keywords = VALUES(keywords), landmark_name = VALUES(landmark_name),
         image_url = VALUES(image_url), image_provider = VALUES(image_provider),
         image_id = VALUES(image_id), photographer_name = VALUES(photographer_name),
         photographer_url = VALUES(photographer_url),
         image_source_url = VALUES(image_source_url),
         display_order = VALUES(display_order), is_active = VALUES(is_active)`,
      params(input),
    );
    const rows = await databaseClient.query<FeaturedCountryRow>(
      `SELECT ${SELECT_COLUMNS} FROM featured_countries WHERE country_code = ?`,
      [input.countryCode.toUpperCase()],
    );
    if (!rows[0]) throw new Error('Featured country upsert failed');
    return mapRow(rows[0]);
  },

  async findById(id) {
    const rows = await databaseClient.query<FeaturedCountryRow>(
      `SELECT ${SELECT_COLUMNS} FROM featured_countries WHERE fc_id = ?`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async findByCode(code) {
    const rows = await databaseClient.query<FeaturedCountryRow>(
      `SELECT ${SELECT_COLUMNS} FROM featured_countries WHERE country_code = ?`,
      [code.toUpperCase()],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async findPage({ page, pageSize }, query) {
    const where = query ? 'WHERE is_active = 1 AND country_name LIKE ?' : 'WHERE is_active = 1';
    const whereParams: SqlParam[] = query ? [`%${query}%`] : [];
    const rows = await databaseClient.query<FeaturedCountryRow>(
      `SELECT ${SELECT_COLUMNS} FROM featured_countries ${where}
       ORDER BY display_order ASC, country_name ASC LIMIT ? OFFSET ?`,
      [...whereParams, pageSize, (page - 1) * pageSize],
    );
    const totals = await databaseClient.query<{ total: number }>(
      `SELECT COUNT(*) AS total FROM featured_countries ${where}`,
      whereParams,
    );
    return {
      items: rows.map(mapRow),
      page,
      pageSize,
      totalItems: Number(totals[0]?.total ?? 0),
    };
  },

  async update(id, input) {
    const sets: string[] = [];
    const updateParams: SqlParam[] = [];
    for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
      const value = (input as Record<string, unknown>)[field];
      if (value !== undefined) {
        sets.push(`${column} = ?`);
        updateParams.push(
          field === 'countryCode' ? (value as string).toUpperCase() : (value as string | number),
        );
      }
    }
    if (input.keywords !== undefined) {
      sets.push('keywords = ?');
      updateParams.push(JSON.stringify(input.keywords));
    }
    if (input.isActive !== undefined) {
      sets.push('is_active = ?');
      updateParams.push(input.isActive ? 1 : 0);
    }
    if (sets.length > 0) {
      updateParams.push(id);
      const result = await databaseClient.execute(
        `UPDATE featured_countries SET ${sets.join(', ')} WHERE fc_id = ?`,
        updateParams,
      );
      if (result.affectedRows === 0) return null;
    }
    return this.findById(id);
  },

  async delete(id) {
    const result = await databaseClient.execute(
      'DELETE FROM featured_countries WHERE fc_id = ?',
      [id],
    );
    return result.affectedRows > 0;
  },
};
