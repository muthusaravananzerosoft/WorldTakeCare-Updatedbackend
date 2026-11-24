import { databaseClient } from '../database/client.js';
import type { CountryRef, NamedOption, StateRef } from '../entities/profile.types.js';

/**
 * Read access to the legacy lookup tables (countries, country_states,
 * race, height, education_level). Religion / marital status / traits /
 * looking-to-meet have no tables — those options are constants.
 */
export interface ReferenceRepository {
  listCountries(): Promise<CountryRef[]>;
  listStatesByCountryId(countryId: number): Promise<StateRef[]>;
  listRaces(): Promise<NamedOption[]>;
  listHeights(): Promise<NamedOption[]>;
  listEducations(): Promise<NamedOption[]>;
  findCountriesByCodes(codes: string[]): Promise<CountryRef[]>;
  findCountriesByIds(ids: number[]): Promise<CountryRef[]>;
  /** States with their parent country id — used to verify state↔country pairs. */
  findStatesByIds(ids: number[]): Promise<(StateRef & { countryId: number })[]>;
  raceExists(id: number): Promise<boolean>;
  heightExists(id: number): Promise<boolean>;
  educationExists(id: number): Promise<boolean>;
}

interface CountryRow {
  con_id: number;
  code: string | null;
  name: string;
}

function mapCountry(row: CountryRow): CountryRef {
  return { id: Number(row.con_id), code: row.code || null, name: row.name };
}

const placeholders = (n: number) => new Array(n).fill('?').join(', ');

export const referenceRepository: ReferenceRepository = {
  async listCountries() {
    const rows = await databaseClient.query<CountryRow>(
      'SELECT con_id, code, name FROM countries ORDER BY name ASC',
    );
    return rows.map(mapCountry);
  },

  async listStatesByCountryId(countryId) {
    const rows = await databaseClient.query<{ sta_id: number; name: string }>(
      'SELECT sta_id, name FROM country_states WHERE fcon_id = ? ORDER BY name ASC',
      [countryId],
    );
    return rows.map((r) => ({ id: Number(r.sta_id), name: r.name }));
  },

  async listRaces() {
    const rows = await databaseClient.query<{ rac_id: number; name: string }>(
      'SELECT rac_id, name FROM race ORDER BY priority ASC, name ASC',
    );
    return rows.map((r) => ({ id: Number(r.rac_id), name: r.name }));
  },

  async listHeights() {
    const rows = await databaseClient.query<{ hei_id: number; name: string }>(
      'SELECT hei_id, name FROM height ORDER BY priority ASC, name ASC',
    );
    return rows.map((r) => ({ id: Number(r.hei_id), name: r.name }));
  },

  async listEducations() {
    const rows = await databaseClient.query<{ edu_id: number; name: string }>(
      'SELECT edu_id, name FROM education_level ORDER BY priority ASC, name ASC',
    );
    return rows.map((r) => ({ id: Number(r.edu_id), name: r.name }));
  },

  async findCountriesByCodes(codes) {
    if (codes.length === 0) return [];
    const rows = await databaseClient.query<CountryRow>(
      `SELECT con_id, code, name FROM countries WHERE code IN (${placeholders(codes.length)})`,
      [...codes],
    );
    return rows.map(mapCountry);
  },

  async findCountriesByIds(ids) {
    if (ids.length === 0) return [];
    const rows = await databaseClient.query<CountryRow>(
      `SELECT con_id, code, name FROM countries WHERE con_id IN (${placeholders(ids.length)})`,
      [...ids],
    );
    return rows.map(mapCountry);
  },

  async findStatesByIds(ids) {
    if (ids.length === 0) return [];
    const rows = await databaseClient.query<{ sta_id: number; name: string; fcon_id: number }>(
      `SELECT sta_id, name, fcon_id FROM country_states WHERE sta_id IN (${placeholders(ids.length)})`,
      [...ids],
    );
    return rows.map((r) => ({ id: Number(r.sta_id), name: r.name, countryId: Number(r.fcon_id) }));
  },

  async raceExists(id) {
    const rows = await databaseClient.query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM race WHERE rac_id = ?',
      [id],
    );
    return Number(rows[0]?.n ?? 0) > 0;
  },

  async heightExists(id) {
    const rows = await databaseClient.query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM height WHERE hei_id = ?',
      [id],
    );
    return Number(rows[0]?.n ?? 0) > 0;
  },

  async educationExists(id) {
    const rows = await databaseClient.query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM education_level WHERE edu_id = ?',
      [id],
    );
    return Number(rows[0]?.n ?? 0) > 0;
  },
};
