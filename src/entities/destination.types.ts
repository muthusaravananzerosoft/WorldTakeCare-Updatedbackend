export type DestinationKind = 'country' | 'state' | 'city' | 'place';

/** Row of the `destinations` table — one id space for every search result. */
export interface DestinationRecord {
  id: number;
  kind: DestinationKind;
  name: string;
  /** State / region name (e.g. 'Tamil Nadu'). */
  admin1: string | null;
  /** ISO-3166 alpha-2 when known. */
  countryCode: string | null;
  countryName: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  sourceId: string;
}

/** Safe destination shape returned to clients. */
export interface DestinationResult {
  id: number;
  kind: DestinationKind;
  name: string;
  admin1: string | null;
  countryCode: string | null;
  countryName: string | null;
  lat: number | null;
  lng: number | null;
}

export interface DestinationSearchInput {
  q: string;
  limit: number;
  kind?: DestinationKind;
}

/** Row of the `attractions` table — provider POIs cached per destination. */
export interface AttractionRecord {
  id: number;
  destinationId: number;
  /** Display name — English-preferred (name_international.en when present). */
  name: string;
  /** Provider's raw/local-script name when it differs from the display name. */
  originalName: string | null;
  category: string | null;
  lat: number;
  lng: number;
  /** Provider popularity signal 0–7 when supplied (Geoapify rarely provides it). */
  rate: number;
  /** Our computed 0–100 tourist-relevance score (category-based, documented). */
  touristRelevance: number;
  isFeatured: boolean;
  distanceM: number | null;
  /** Provider that produced the row ('geoapify', ...). */
  source: string;
}

/** Row of the `curated_attractions` table — hand-verified famous spots. */
export interface CuratedAttraction {
  id: number;
  name: string;
  originalName: string | null;
  category: string | null;
  lat: number;
  lng: number;
  city: string;
  admin1: string | null;
  countryCode: string;
}

/** Safe attraction shape returned to clients. */
export interface AttractionResult {
  id: number;
  /** English-preferred display name. */
  name: string;
  /** Local-script name when it differs (e.g. Tamil original). */
  originalName: string | null;
  category: string | null;
  lat: number;
  lng: number;
  distanceM: number | null;
  /** True when beyond the in-city radius — a day-trip destination. */
  dayTrip: boolean;
  isFeatured: boolean;
  /** Our computed 0–100 category-based relevance (not a provider rating). */
  touristRelevance: number;
  source: string;
}

export interface AttractionsInput {
  limit: number;
  radiusKm: number;
}

export interface CuratedLookup {
  /** Destination name — matched case-insensitively against curated.city. */
  city: string;
  countryCode: string | null;
  lat: number;
  lng: number;
  radiusM: number;
}
