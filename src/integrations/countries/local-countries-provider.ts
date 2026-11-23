import { databaseClient } from '../../database/client.js';
import type { CountryInfo, CountryInfoProvider } from './country-info.interface.js';

/**
 * Verifies country codes against the legacy `countries` reference table
 * (241 rows, alpha-2 codes). Replaces the REST Countries API — its v3
 * endpoint was shut down and v5 requires a key for what is only a
 * seed-time sanity check.
 */
export class LocalCountriesProvider implements CountryInfoProvider {
  async findByCode(code: string): Promise<CountryInfo | null> {
    const rows = await databaseClient.query<{ name: string; code: string }>(
      'SELECT name, code FROM countries WHERE code = ? LIMIT 1',
      [code.toUpperCase()],
    );
    const row = rows[0];
    return row ? { name: row.name, code: row.code, region: null } : null;
  }
}
