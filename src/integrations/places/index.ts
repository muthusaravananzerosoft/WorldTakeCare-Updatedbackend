import { env } from '../../config/env.config.js';
import { GeoapifyProvider } from './geoapify-provider.js';
import { NullPlacesProvider } from './null-places-provider.js';
import type { AttractionsProvider, GeoSearchProvider } from './places-provider.interface.js';

/**
 * Provider selection — the only place concrete adapters are chosen.
 * Without GEOAPIFY_API_KEY the app still runs: local destination search
 * works and attraction/geo-fallback lookups return empty results.
 */
const provider: GeoSearchProvider & AttractionsProvider = env.GEOAPIFY_API_KEY
  ? new GeoapifyProvider(env.GEOAPIFY_API_KEY)
  : new NullPlacesProvider();

/** Name stored in `source` columns for rows created from this provider. */
export const placesSourceName = env.GEOAPIFY_API_KEY ? 'geoapify' : 'none';

/** Worldwide destination geo search (fallback when local tables miss). */
export const geoSearchProvider: GeoSearchProvider = provider;

/** Tourist attraction discovery near a destination. */
export const attractionsProvider: AttractionsProvider = provider;
