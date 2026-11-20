import type {
  AttractionsProvider,
  GeoPlaceHit,
  GeoSearchProvider,
  NearbyAttraction,
} from './places-provider.interface.js';

/**
 * No-op provider used when no places API key is configured. Keeps the API
 * fully functional — local destination search still works, attraction
 * lookups and geo fallback return empty results.
 */
export class NullPlacesProvider implements GeoSearchProvider, AttractionsProvider {
  async geocode(_query: string): Promise<GeoPlaceHit | null> {
    return null;
  }

  async search(_query: string, _limit: number): Promise<GeoPlaceHit[]> {
    return [];
  }

  async findAttractions(_input: {
    lat: number;
    lng: number;
    radiusM: number;
    limit: number;
  }): Promise<NearbyAttraction[]> {
    return [];
  }
}
