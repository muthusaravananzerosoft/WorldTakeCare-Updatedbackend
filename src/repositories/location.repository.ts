import { databaseClient } from '../database/client.js';
import type { DestinationKind } from '../entities/destination.types.js';

/** A hit from the legacy geo reference tables (pre-materialisation). */
export interface LocationHit {
  kind: Exclude<DestinationKind, 'place'>;
  /** cit_id / sta_id / con_id in the source legacy table. */
  legacyId: number;
  name: string;
  admin1: string | null;
  countryCode: string | null;
  countryName: string | null;
}

export interface LocationRepository {
  /** Searches countries, states and cities by name; best matches first. */
  search(query: string, limit: number): Promise<LocationHit[]>;
}

interface CityRow {
  cit_id: number;
  name: string;
  state_name: string;
  country_code: string;
  country_name: string;
}

interface StateRow {
  sta_id: number;
  name: string;
  country_code: string;
  country_name: string;
}

interface CountryRow {
  con_id: number;
  code: string;
  name: string;
}

/** LIKE escaping so user input can't inject `%`/`_` wildcards. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (m) => `\\${m}`);

/** Match quality for client-side merge ordering. */
function matchScore(name: string, query: string): number {
  const lower = name.toLowerCase();
  if (lower === query) return 3;
  if (lower.startsWith(query)) return 2;
  return 1;
}

export const locationRepository: LocationRepository = {
  async search(query: string, limit: number): Promise<LocationHit[]> {
    const q = query.toLowerCase();
    const pattern = `%${escapeLike(query)}%`;
    const prefix = `${escapeLike(query)}%`;
    // Prefix matches rank above infix matches inside each type. The name
    // column must be alias-qualified — joined tables also have `name`.
    const orderBy = (col: string) =>
      `ORDER BY (${col} LIKE ? ESCAPE '\\\\') DESC, ${col} LIMIT ?`;

    const [cities, states, countries] = await Promise.all([
      databaseClient.query<CityRow>(
        `SELECT c.cit_id, c.name, s.name AS state_name, co.code AS country_code, co.name AS country_name
           FROM country_state_cities c
           JOIN country_states s ON s.sta_id = c.fsta_id
           JOIN countries co ON co.con_id = s.fcon_id
          WHERE c.name LIKE ? ESCAPE '\\\\'
          ${orderBy('c.name')}`,
        [pattern, prefix, limit],
      ),
      databaseClient.query<StateRow>(
        `SELECT s.sta_id, s.name, co.code AS country_code, co.name AS country_name
           FROM country_states s
           JOIN countries co ON co.con_id = s.fcon_id
          WHERE s.name LIKE ? ESCAPE '\\\\'
          ${orderBy('s.name')}`,
        [pattern, prefix, limit],
      ),
      databaseClient.query<CountryRow>(
        `SELECT con_id, code, name
           FROM countries
          WHERE name LIKE ? ESCAPE '\\\\'
          ${orderBy('name')}`,
        [pattern, prefix, limit],
      ),
    ]);

    const hits: LocationHit[] = [
      ...cities.map((r) => ({
        kind: 'city' as const,
        legacyId: r.cit_id,
        name: r.name,
        admin1: r.state_name,
        countryCode: r.country_code,
        countryName: r.country_name,
      })),
      ...states.map((r) => ({
        kind: 'state' as const,
        legacyId: r.sta_id,
        name: r.name,
        admin1: null,
        countryCode: r.country_code,
        countryName: r.country_name,
      })),
      ...countries.map((r) => ({
        kind: 'country' as const,
        legacyId: r.con_id,
        name: r.name,
        admin1: null,
        countryCode: r.code,
        countryName: r.name,
      })),
    ];

    return hits
      .sort((a, b) => matchScore(b.name, q) - matchScore(a.name, q) || a.name.localeCompare(b.name))
      .slice(0, limit);
  },
};
