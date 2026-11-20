import { LocalCountriesProvider } from './local-countries-provider.js';
import type { CountryInfoProvider } from './country-info.interface.js';

/**
 * Country info provider — verifies codes against the local `countries`
 * reference table (REST Countries v3 was retired; a local lookup is faster
 * and needs no key).
 */
export const countryInfoProvider: CountryInfoProvider = new LocalCountriesProvider();
