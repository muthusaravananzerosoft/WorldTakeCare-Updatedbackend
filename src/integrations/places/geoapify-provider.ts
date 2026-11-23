import { haversineM } from '../../common/utils/geo.js';
import type { DestinationKind } from '../../entities/destination.types.js';
import type {
  AttractionsProvider,
  GeoPlaceHit,
  GeoSearchProvider,
  NearbyAttraction,
} from './places-provider.interface.js';

const GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search';
const AUTOCOMPLETE_URL = 'https://api.geoapify.com/v1/geocode/autocomplete';
const PLACES_URL = 'https://api.geoapify.com/v2/places';
const REQUEST_TIMEOUT_MS = 8000;
/** Top-N of the merged pool that gets cached per destination. */
const POOL_KEEP = 100;

/**
 * Tourist-focused Places queries, run in parallel with proximity bias.
 * The Geoapify Places API has no fame ordering and returns an arbitrary
 * slice for dense cities — so each tourist tier gets its own query+quota
 * and can't be drowned out by another (e.g. Paris street-art mosaics or
 * neighbourhood churches). religion.place_of_worship stays (in India
 * famous temples like Meenakshi Amman are tagged religion.*, not
 * tourism.*) but scores LOW — see CATEGORY_SCORES.
 * Geoapify requires the "Powered by Geoapify" + OSM attribution wherever
 * results are displayed; see documentation/module-plans/destinations.
 */
const ATTRACTION_QUERIES: ReadonlyArray<{ categories: string; limit: number }> = [
  {
    // Landmarks: sights, heritage, towers, historic/tourism buildings.
    categories:
      'tourism.sights,heritage,man_made.tower,building.tourism,building.historic',
    limit: 300,
  },
  {
    // Culture & nature: museums, zoos, parks, viewpoints of nature.
    categories:
      'entertainment.museum,entertainment.culture,entertainment.zoo,' +
      'entertainment.theme_park,natural,beach,national_park,leisure.park',
    limit: 200,
  },
  {
    // Secondary: generic attractions + worship places (famous temples live
    // here but so do ordinary ones — scoring separates them).
    categories: 'tourism.attraction,religion.place_of_worship',
    limit: 150,
  },
];

/**
 * Category-prefix → tourist-relevance base score (0–100).
 * Scoring is our documented heuristic — Geoapify supplies no fame/popularity
 * data, so we never pretend it does. Higher = more likely a genuine tourist
 * landmark; generic worship places and artwork rank low.
 * Order matters: the most specific matching category wins.
 */
const CATEGORY_SCORES: ReadonlyArray<{ prefix: string; score: number }> = [
  { prefix: 'heritage', score: 92 },
  { prefix: 'national_park', score: 90 },
  { prefix: 'tourism.sights.fort', score: 90 },
  { prefix: 'tourism.sights.castle', score: 88 },
  { prefix: 'tourism.sights.tower', score: 88 },
  { prefix: 'tourism.sights.memorial.monument', score: 85 },
  { prefix: 'tourism.sights.place_of_worship', score: 82 },
  { prefix: 'tourism.sights.memorial', score: 78 },
  { prefix: 'tourism.sights', score: 85 },
  { prefix: 'tourism.attraction.viewpoint', score: 80 },
  { prefix: 'tourism.attraction.artwork.mosaic', score: 10 },
  { prefix: 'tourism.attraction.artwork', score: 20 },
  { prefix: 'tourism.attraction.fountain', score: 45 },
  { prefix: 'tourism.attraction', score: 55 },
  { prefix: 'man_made.tower', score: 80 },
  { prefix: 'building.tourism', score: 78 },
  { prefix: 'building.historic', score: 70 },
  { prefix: 'entertainment.museum', score: 82 },
  { prefix: 'entertainment.culture', score: 75 },
  { prefix: 'entertainment.zoo', score: 72 },
  { prefix: 'entertainment.theme_park', score: 72 },
  { prefix: 'natural.mountain_peak', score: 85 },
  { prefix: 'natural.water', score: 82 },
  { prefix: 'natural', score: 72 },
  { prefix: 'leisure.park.garden', score: 80 },
  { prefix: 'leisure.park.nature_reserve', score: 80 },
  { prefix: 'leisure.park', score: 60 },
  { prefix: 'beach', score: 78 },
  { prefix: 'religion.place_of_worship', score: 40 },
  { prefix: 'religion', score: 35 },
];

/** Extra relevance when OSM links the place to Wikidata/Wikipedia —
 *  the closest thing OSM has to a "notable" flag. Street art and local
 *  churches lack it; landmarks have it. */
const NOTABILITY_BONUS = 30;
/** Distance shaves at most this much off the relevance score. */
const MAX_DISTANCE_PENALTY = 10;
/** Category-prefixes that qualify a POI for a display label + scoring. */
const TOURIST_CATEGORY_PREFIXES = [
  'tourism.',
  'heritage',
  'man_made.tower',
  'building.tourism',
  'building.historic',
  'entertainment.',
  'national_park',
  'natural',
  'leisure.',
  'beach',
  'religion.',
];

/** result_type values that represent a destination (not a street/venue). */
const DESTINATION_RESULT_TYPES = new Set([
  'country',
  'state',
  'county',
  'city',
  'district',
  'town',
  'village',
]);

/** Geoapify result_type → our destination granularity. */
const RESULT_TYPE_KIND: Record<string, DestinationKind> = {
  country: 'country',
  state: 'state',
  city: 'city',
  town: 'city',
  village: 'city',
};

interface GeoapifyProperties {
  place_id?: string;
  name?: string;
  formatted?: string;
  country?: string;
  country_code?: string;
  state?: string;
  county?: string;
  city?: string;
  result_type?: string;
  categories?: string[];
  distance?: number;
  lat?: number;
  lon?: number;
  popularity?: number;
  rank?: { popularity?: number; importance?: number };
  name_international?: Record<string, string>;
  datasource?: { sourcename?: string; raw?: Record<string, unknown> };
}

interface GeoapifyFeature {
  properties?: GeoapifyProperties;
  geometry?: { coordinates?: [number, number] };
}

interface GeoapifyFeatureCollection {
  features?: GeoapifyFeature[];
}

/** Geoapify has no 0-7 fame score — map popularity (0-1 or raw) onto it. */
function toRate(p: GeoapifyProperties): number {
  const popularity = p.rank?.popularity ?? p.popularity;
  if (typeof popularity !== 'number') return 0;
  const scaled = popularity <= 1 ? Math.round(popularity * 7) : Math.round(popularity);
  return Math.max(0, Math.min(7, scaled));
}

/** Most specific tourist-relevant category string, or null. */
function mostSpecificCategory(categories: string[] | undefined): string | null {
  return (
    categories
      ?.filter(
        (c) =>
          c !== 'tourism' &&
          c !== 'leisure' &&
          TOURIST_CATEGORY_PREFIXES.some((prefix) => c.startsWith(prefix)),
      )
      .sort((a, b) => b.length - a.length)[0] ?? null
  );
}

/** Qualifying Geoapify category → display label ('…place_of_worship' → 'place of worship'). */
function toCategory(categories: string[] | undefined): string | null {
  const mostSpecific = mostSpecificCategory(categories);
  if (!mostSpecific) return null;
  if (mostSpecific.includes('place_of_worship')) return 'place of worship';
  return mostSpecific.split('.').pop()?.replaceAll('_', ' ') ?? null;
}

/**
 * Computed tourist relevance (0–100): best category base, +wikidata bonus,
 * −distance penalty. Documented heuristic — no invented popularity data.
 */
function toTouristRelevance(
  categories: string[] | undefined,
  p: GeoapifyProperties,
  distanceM: number,
  radiusM: number,
): number {
  // Longest matching prefix wins — specific rules override generic ones.
  let score = 0;
  let bestPrefixLen = -1;
  for (const { prefix, score: base } of CATEGORY_SCORES) {
    const matches =
      prefix.length > bestPrefixLen &&
      categories?.some((c) => c === prefix || c.startsWith(`${prefix}.`));
    if (matches) {
      score = base;
      bestPrefixLen = prefix.length;
    }
  }
  if (score === 0) return 0;
  const raw = p.datasource?.raw;
  if (raw?.['wikidata'] || raw?.['wikipedia']) score += NOTABILITY_BONUS;
  const penalty = Math.round(
    Math.min(distanceM / Math.max(radiusM, 1), 1) * MAX_DISTANCE_PENALTY,
  );
  return Math.max(0, Math.min(100, score - penalty));
}

/** English-preferred display name + preserved original when different. */
function toNames(p: GeoapifyProperties): { name: string; originalName: string | null } {
  const rawEnglish = p.datasource?.raw?.['name:en'];
  const english =
    p.name_international?.en ?? (typeof rawEnglish === 'string' ? rawEnglish : null);
  const name = english ?? p.name ?? '';
  return { name, originalName: name !== (p.name ?? '') ? p.name ?? null : null };
}

function pickName(p: GeoapifyProperties): string | null {
  switch (p.result_type) {
    case 'country':
      return p.country ?? null;
    case 'state':
      return p.state ?? null;
    case 'county':
      return p.county ?? null;
    default:
      return p.city ?? p.name ?? null;
  }
}

/** GeoJSON feature → GeoPlaceHit; null when unusable (no name/coords). */
function toGeoPlaceHit(f: GeoapifyFeature): GeoPlaceHit | null {
  const p = f.properties;
  if (!p || typeof p.lat !== 'number' || typeof p.lon !== 'number') return null;
  const name = pickName(p);
  if (!name) return null;
  return {
    sourceId: String(p.place_id ?? p.formatted ?? name),
    name,
    admin1: p.state ?? p.county ?? null,
    countryCode: p.country_code ? p.country_code.toUpperCase() : null,
    countryName: p.country ?? null,
    lat: p.lat,
    lng: p.lon,
    kind: RESULT_TYPE_KIND[p.result_type ?? ''] ?? 'place',
    ...(typeof p.rank?.importance === 'number' ? { importance: p.rank.importance } : {}),
  };
}

/**
 * Geoapify adapter — Geocoding API for worldwide destination resolution,
 * Places API for tourist-attraction discovery. All failures degrade to
 * null / empty list so a provider outage never takes search down.
 */
export class GeoapifyProvider implements GeoSearchProvider, AttractionsProvider {
  constructor(private readonly apiKey: string) {}

  async geocode(query: string): Promise<GeoPlaceHit | null> {
    try {
      const data = await this.get<GeoapifyFeatureCollection>(GEOCODE_URL, {
        text: query,
        limit: 5,
        lang: 'en',
      });
      const features = data.features ?? [];
      // Prefer a real destination result (city/state/country) over a street
      // or venue the geocoder may rank first.
      const feature =
        features.find((f) => DESTINATION_RESULT_TYPES.has(f.properties?.result_type ?? '')) ??
        features[0];
      return feature ? toGeoPlaceHit(feature) : null;
    } catch {
      return null;
    }
  }

  async search(query: string, limit: number): Promise<GeoPlaceHit[]> {
    try {
      const data = await this.get<GeoapifyFeatureCollection>(AUTOCOMPLETE_URL, {
        text: query,
        limit,
        lang: 'en',
      });
      const seen = new Set<string>();
      const hits: GeoPlaceHit[] = [];
      for (const f of data.features ?? []) {
        if (!DESTINATION_RESULT_TYPES.has(f.properties?.result_type ?? '')) continue;
        const hit = toGeoPlaceHit(f);
        if (!hit) continue;
        const key = `${hit.name.toLowerCase()}|${hit.admin1}|${hit.countryCode}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push(hit);
      }
      return hits;
    } catch {
      return [];
    }
  }

  async findAttractions(input: {
    lat: number;
    lng: number;
    radiusM: number;
    limit: number;
  }): Promise<NearbyAttraction[]> {
    try {
      const filter = `circle:${input.lng},${input.lat},${input.radiusM}`;
      const bias = `proximity:${input.lng},${input.lat}`;
      // One request per tourist tier — a single quota would be consumed by
      // whichever noise a dense city has most of (artwork, churches).
      const pages = await Promise.all(
        ATTRACTION_QUERIES.map((q) =>
          this.get<GeoapifyFeatureCollection>(PLACES_URL, {
            categories: q.categories,
            filter,
            bias,
            limit: q.limit,
            lang: 'en',
          }),
        ),
      );
      const seen = new Set<string>();
      const out: NearbyAttraction[] = [];
      for (const f of pages.flatMap((d) => d.features ?? [])) {
        const p = f.properties ?? {};
        const lat = typeof p.lat === 'number' ? p.lat : f.geometry?.coordinates?.[1];
        const lng = typeof p.lon === 'number' ? p.lon : f.geometry?.coordinates?.[0];
        if (!p.place_id || !p.name || lat === undefined || lng === undefined) continue;
        const id = String(p.place_id);
        if (seen.has(id)) continue;
        seen.add(id);
        const distanceM =
          typeof p.distance === 'number'
            ? Math.round(p.distance)
            : haversineM(input.lat, input.lng, lat, lng);
        const names = toNames(p);
        out.push({
          sourceId: id,
          name: names.name,
          originalName: names.originalName,
          category: toCategory(p.categories),
          lat,
          lng,
          rate: toRate(p),
          touristRelevance: toTouristRelevance(p.categories, p, distanceM, input.radiusM),
          distanceM,
        });
      }
      // Most relevant first — distance was never a fame proxy. Keep the
      // best of the pool so caching stays bounded (tiers fetch up to ~650).
      out.sort(
        (a, b) => b.touristRelevance - a.touristRelevance || (a.distanceM ?? 0) - (b.distanceM ?? 0),
      );
      return out.slice(0, POOL_KEEP);
    } catch {
      return [];
    }
  }

  private async get<T>(url: string, params: Record<string, string | number>): Promise<T> {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    );
    qs.set('apiKey', this.apiKey);
    const res = await fetch(`${url}?${qs.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Geoapify request failed: HTTP ${res.status}`);
    return res.json() as Promise<T>;
  }
}
