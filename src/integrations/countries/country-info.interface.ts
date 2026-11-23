/** Canonical country info (REST Countries). */
export interface CountryInfo {
  /** Official common name, e.g. 'France'. */
  name: string;
  /** ISO-3166 alpha-2, upper-case. */
  code: string;
  region: string | null;
}

export interface CountryInfoProvider {
  /** Looks up a country by ISO alpha-2 code; null when unknown. */
  findByCode(code: string): Promise<CountryInfo | null>;
}
