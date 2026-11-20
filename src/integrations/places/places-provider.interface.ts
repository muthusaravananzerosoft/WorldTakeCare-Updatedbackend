/**
 * External places/POI provider contracts. Business logic depends only on
 * these two interfaces — a new provider (GeoNames, Google Places, ...) is
 * swapped in `integrations/places/index.ts` without touching services.
 *
 * Geo-search (destination resolution) is deliberately a separate contract
 * from tourist-attraction discovery, so each can be replaced independently.
 */
import type { DestinationKind } from '../../entities/destination.types.js';

/** A worldwide place found by free-text geo search. */
export interface GeoPlaceHit {
  /** Stable provider identifier for the place. */
  sourceId: string;
  name: string;
  /** State / region name when the provider supplies it. */
  admin1: string | null;
  /** ISO-3166 alpha-2 when the provider supplies it. */
  countryCode: string | null;
  countryName: string | null;
  lat: number;
  lng: number;
  /** Destination granularity when the provider reports it (else 'place'). */
  kind?: DestinationKind;
  /**
   * Provider-reported place importance (0–1) when available — used to rank
   * famous world places above minor local namesakes. Never invented.
   */
  importance?: number;
}

/** A tourist attraction/POI near a coordinate. */
export interface NearbyAttraction {
  /** Stable provider identifier for the POI (Geoapify place_id). */
  sourceId: string;
  /** Display name — English-preferred when the provider offers one. */
  name: string;
  /** Provider's raw/local-script name when it differs from `name`. */
  originalName: string | null;
  /** Human-readable category (e.g. 'historic temple') when available. */
  category: string | null;
  lat: number;
  lng: number;
  /** Provider popularity signal 0–7; 0 when the provider gives none. */
  rate: number;
  /** Computed 0–100 tourist-relevance score (category-based heuristic). */
  touristRelevance: number;
  distanceM: number | null;
}

/** Worldwide place lookup (free text → best match with coordinates). */
export interface GeoSearchProvider {
  /** Single best match — used to resolve coordinates for a known place. */
  geocode(query: string): Promise<GeoPlaceHit | null>;
  /** Typeahead-style multi-match suggestions — used by destination search. */
  search(query: string, limit: number): Promise<GeoPlaceHit[]>;
}

/** Famous tourist attractions around a coordinate. */
export interface AttractionsProvider {
  findAttractions(input: {
    lat: number;
    lng: number;
    radiusM: number;
    limit: number;
  }): Promise<NearbyAttraction[]>;
}
