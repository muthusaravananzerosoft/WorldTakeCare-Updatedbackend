import { AppError } from '../common/errors/app-error.js';
import { haversineM } from '../common/utils/geo.js';
import type {
  AttractionRecord,
  AttractionResult,
  AttractionsInput,
  CuratedAttraction,
  DestinationRecord,
  DestinationResult,
  DestinationSearchInput,
} from '../entities/destination.types.js';
import {
  attractionsProvider,
  geoSearchProvider,
  placesSourceName,
} from '../integrations/places/index.js';
import type {
  AttractionsProvider,
  GeoSearchProvider,
} from '../integrations/places/places-provider.interface.js';
import {
  attractionRepository,
  type AttractionRepository,
} from '../repositories/attraction.repository.js';
import {
  destinationRepository,
  type DestinationRepository,
} from '../repositories/destination.repository.js';
import {
  locationRepository,
  type LocationRepository,
} from '../repositories/location.repository.js';

export interface DestinationServiceDeps {
  locations: LocationRepository;
  destinations: DestinationRepository;
  attractions: AttractionRepository;
  geoSearch: GeoSearchProvider;
  attractionSource: AttractionsProvider;
  /** Provider name stored in `source` columns for externally-sourced rows. */
  sourceName: string;
}

function toDestinationResult(row: DestinationRecord): DestinationResult {
  const { id, kind, name, admin1, countryCode, countryName, lat, lng } = row;
  return { id, kind, name, admin1, countryCode, countryName, lat, lng };
}

/** Spots further than this from the destination centre are day trips, not city sights. */
const DAY_TRIP_THRESHOLD_M = 12_000;
/** Verified-famous curated entries outrank all provider rows. */
const CURATED_RELEVANCE = 90;
/** Provider↔curated dedupe by proximity when names differ. */
const CURATED_MATCH_RADIUS_M = 250;
/**
 * Provider rows within this distance of a same-category higher-ranked row
 * are collapsed — OSM often has one site as several nearby features
 * ("Keeladi Museum" / "Keezhadi Archeological Museum").
 */
/** Same-category provider dupes collapse within this radius. */
const PROVIDER_DEDUP_RADIUS_M = 120;
/** Same-name-ish provider dupes collapse within this (wider) radius. */
const PROVIDER_NAME_DEDUP_RADIUS_M = 200;

/** Lowercase, strip accents + non-alphanumerics so 'Cathédrale' ~ 'cathedrale'. */
const normalizeName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * True when two names share a ≥8-char run — catches the same landmark
 * stored as two OSM features under different categories
 * ('Cathédrale Notre-Dame de Paris' vs 'Cathedral of Notre Dame').
 */
function sharesNameRun(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  let prev = new Array<number>(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const curr = new Array<number>(y.length + 1).fill(0);
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] === y[j - 1]) {
        curr[j] = (prev[j - 1] ?? 0) + 1;
        if ((curr[j] ?? 0) >= 8) return true;
      }
    }
    prev = curr;
  }
  return false;
}

function toAttractionResult(row: AttractionRecord): AttractionResult {
  return {
    id: row.id,
    name: row.name,
    originalName: row.originalName,
    category: row.category,
    lat: row.lat,
    lng: row.lng,
    distanceM: row.distanceM,
    dayTrip: (row.distanceM ?? 0) > DAY_TRIP_THRESHOLD_M,
    isFeatured: row.isFeatured,
    touristRelevance: row.touristRelevance,
    source: row.source,
  };
}

function curatedToResult(
  c: CuratedAttraction,
  dest: DestinationRecord,
): AttractionResult {
  const distanceM = haversineM(dest.lat ?? c.lat, dest.lng ?? c.lng, c.lat, c.lng);
  return {
    id: c.id,
    name: c.name,
    originalName: c.originalName,
    category: c.category,
    lat: c.lat,
    lng: c.lng,
    distanceM,
    dayTrip: distanceM > DAY_TRIP_THRESHOLD_M,
    isFeatured: true,
    touristRelevance: CURATED_RELEVANCE,
    source: 'curated',
  };
}

/**
 * Merges provider results with curated famous spots:
 * - a curated row matching a provider row (same normalised name or within
 *   250 m) upgrades that row to featured — no duplicate emitted;
 * - unmatched curated rows that belong to the city or sit inside the search
 *   radius are appended as source='curated' featured entries;
 * - order: featured → touristRelevance → distance.
 */
function mergeAttractions(
  dest: DestinationRecord,
  providerRows: AttractionRecord[],
  curatedRows: CuratedAttraction[],
  radiusM: number,
): AttractionResult[] {
  // Provider-side dedupe first: rows are relevance-sorted, so the first of
  // a same-category cluster wins (name spellings often differ slightly).
  const providerKept: AttractionRecord[] = [];
  for (const row of providerRows) {
    const isDupe = providerKept.some((k) => {
      const d = haversineM(k.lat, k.lng, row.lat, row.lng);
      return (
        (d <= PROVIDER_DEDUP_RADIUS_M && k.category === row.category) ||
        (d <= PROVIDER_NAME_DEDUP_RADIUS_M && sharesNameRun(k.name, row.name))
      );
    });
    if (!isDupe) providerKept.push(row);
  }

  const merged: AttractionResult[] = [];
  const claimed = new Set<number>();

  for (const c of curatedRows) {
    const distanceM = haversineM(dest.lat ?? c.lat, dest.lng ?? c.lng, c.lat, c.lng);
    const belongsToCity =
      c.city.toLowerCase() === dest.name.toLowerCase() && c.countryCode === dest.countryCode;
    if (!belongsToCity && distanceM > radiusM) continue;

    const normC = normalizeName(c.name);
    const match = providerKept.find(
      (p) =>
        !claimed.has(p.id) &&
        (normalizeName(p.name) === normC ||
          haversineM(p.lat, p.lng, c.lat, c.lng) <= CURATED_MATCH_RADIUS_M),
    );

    if (match) {
      claimed.add(match.id);
      merged.push({
        ...toAttractionResult(match),
        name: c.name,
        category: c.category ?? match.category,
        isFeatured: true,
        touristRelevance: Math.max(match.touristRelevance, CURATED_RELEVANCE),
      });
    } else {
      merged.push(curatedToResult(c, dest));
    }
  }

  for (const row of providerKept) {
    if (!claimed.has(row.id)) merged.push(toAttractionResult(row));
  }

  return merged.sort(
    (a, b) =>
      Number(b.isFeatured) - Number(a.isFeatured) ||
      b.touristRelevance - a.touristRelevance ||
      (a.distanceM ?? 0) - (b.distanceM ?? 0),
  );
}

/**
 * Destination search + attraction discovery.
 *
 * Search order: legacy geo tables first (free, instant), then the external
 * geo-search provider when local data is thin. Every returned hit is
 * materialised into `destinations` so clients always get our stable ids.
 *
 * Attractions are checked in the cache table before any provider call —
 * the first request for a destination hits the attractions provider,
 * later ones read from MySQL only.
 */
export function createDestinationService(deps: DestinationServiceDeps) {
  const { locations, destinations, attractions, geoSearch, attractionSource, sourceName } = deps;

  /** Resolves coordinates once for rows missing them (legacy data has none). */
  async function ensureCoordinates(dest: DestinationRecord): Promise<DestinationRecord> {
    if (dest.lat !== null && dest.lng !== null) return dest;
    const query = [dest.name, dest.admin1, dest.countryName].filter(Boolean).join(', ');
    const geo = await geoSearch.geocode(query);
    if (!geo) return dest;
    await destinations.setCoordinates(dest.id, geo.lat, geo.lng);
    return { ...dest, lat: geo.lat, lng: geo.lng, countryCode: dest.countryCode ?? geo.countryCode };
  }

  async function requireDestination(id: number): Promise<DestinationRecord> {
    const dest = await destinations.findById(id);
    if (!dest) throw AppError.notFound('Destination not found');
    return ensureCoordinates(dest);
  }

  return {
    async search(input: DestinationSearchInput): Promise<{ query: string; results: DestinationResult[] }> {
      const hits = await locations.search(input.q, input.limit);
      const filtered = input.kind ? hits.filter((h) => h.kind === input.kind) : hits;

      const materialised = await Promise.all(
        filtered.map((hit) =>
          destinations.upsert({
            kind: hit.kind,
            name: hit.name,
            admin1: hit.admin1,
            countryCode: hit.countryCode,
            countryName: hit.countryName,
            lat: null,
            lng: null,
            source: 'legacy',
            sourceId: String(hit.legacyId),
          }),
        ),
      );
      const results = materialised.map(toDestinationResult);

      // Worldwide suggestions are always merged in — not only when local
      // data is thin — because obscure local namesakes (10 US towns named
      // "Paris") must not bury a famous world city. A local row matching an
      // external hit stays source='legacy' but inherits the provider's
      // importance score (and coordinates when it has none), so ranking is
      // driven by real provider metadata rather than substring luck.
      const scored = results.map((r) => ({ r, imp: null as number | null }));
      const geoHits = await geoSearch.search(input.q, input.limit);
      for (const geo of geoHits) {
        if (input.kind && geo.kind && geo.kind !== input.kind) continue;
        const match = scored.find(
          ({ r }) =>
            r.name.toLowerCase() === geo.name.toLowerCase() &&
            r.countryCode === geo.countryCode &&
            (r.admin1 == null ||
              geo.admin1 == null ||
              r.admin1.toLowerCase() === geo.admin1.toLowerCase()),
        );
        if (match) {
          if (geo.importance != null) match.imp = geo.importance;
          if (match.r.lat === null) {
            await destinations.setCoordinates(match.r.id, geo.lat, geo.lng);
            match.r.lat = geo.lat;
            match.r.lng = geo.lng;
          }
          continue;
        }
        const row = await destinations.upsert({
          kind: geo.kind ?? 'place',
          name: geo.name,
          admin1: geo.admin1,
          countryCode: geo.countryCode,
          countryName: geo.countryName,
          lat: geo.lat,
          lng: geo.lng,
          source: sourceName,
          sourceId: geo.sourceId,
        });
        scored.push({ r: toDestinationResult(row), imp: geo.importance ?? null });
      }

      // Provider importance first (real metadata), local hits without it
      // keep their original order below.
      scored.sort((a, b) => (b.imp ?? -1) - (a.imp ?? -1));

      return { query: input.q, results: scored.slice(0, input.limit).map((s) => s.r) };
    },

    async getById(id: number): Promise<DestinationResult> {
      return toDestinationResult(await requireDestination(id));
    },

    async getAttractions(
      id: number,
      input: AttractionsInput,
    ): Promise<{ destination: DestinationResult; attractions: AttractionResult[] }> {
      const destination = await requireDestination(id);

      // No coordinates and geo-search could not resolve them — degrade gracefully.
      if (destination.lat === null || destination.lng === null) {
        return { destination: toDestinationResult(destination), attractions: [] };
      }

      const radiusM = input.radiusKm * 1000;
      let rows = await attractions.listByDestination(id);
      if (rows.length === 0) {
        const fresh = await attractionSource.findAttractions({
          lat: destination.lat,
          lng: destination.lng,
          radiusM,
          limit: input.limit,
        });
        await attractions.saveAll(id, fresh, sourceName);
        rows = await attractions.listByDestination(id);
      }

      const curated = await attractions.listCurated({
        city: destination.name,
        countryCode: destination.countryCode,
        lat: destination.lat,
        lng: destination.lng,
        radiusM,
      });

      return {
        destination: toDestinationResult(destination),
        attractions: mergeAttractions(destination, rows, curated, radiusM).slice(0, input.limit),
      };
    },
  };
}

export type DestinationService = ReturnType<typeof createDestinationService>;

export const destinationService = createDestinationService({
  locations: locationRepository,
  destinations: destinationRepository,
  attractions: attractionRepository,
  geoSearch: geoSearchProvider,
  attractionSource: attractionsProvider,
  sourceName: placesSourceName,
});
