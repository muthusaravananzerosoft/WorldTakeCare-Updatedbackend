import { databaseClient } from '../database/client.js';
import type {
  AttractionRecord,
  CuratedAttraction,
  CuratedLookup,
} from '../entities/destination.types.js';
import type { NearbyAttraction } from '../integrations/places/places-provider.interface.js';

export interface AttractionRepository {
  /** Cached attractions for a destination, most relevant first. */
  listByDestination(destinationId: number): Promise<AttractionRecord[]>;
  /**
   * Caches provider results. Duplicate provider POIs (same source +
   * source_id) keep their original destination link — first claim wins.
   * `source` is the provider name stored with each row.
   */
  saveAll(destinationId: number, items: NearbyAttraction[], source: string): Promise<void>;
  /** Hand-curated famous spots matching the city name or inside the radius. */
  listCurated(lookup: CuratedLookup): Promise<CuratedAttraction[]>;
  /** Batch-loads cached attraction rows by primary key (itinerary validation/enrichment). */
  findByIds(ids: number[]): Promise<AttractionRecord[]>;
  /** Batch-loads curated rows by primary key. */
  findCuratedByIds(ids: number[]): Promise<CuratedAttraction[]>;
}

interface AttractionRow {
  att_id: number;
  destination_id: number;
  name: string;
  original_name: string | null;
  category: string | null;
  lat: string;
  lng: string;
  rate: number;
  tourist_relevance: number;
  is_featured: number;
  distance_m: number | null;
  source: string;
}

interface CuratedRow {
  cur_id: number;
  name: string;
  original_name: string | null;
  category: string | null;
  lat: string;
  lng: string;
  city: string;
  admin1: string | null;
  country_code: string;
}

function mapRow(row: AttractionRow): AttractionRecord {
  return {
    id: row.att_id,
    destinationId: row.destination_id,
    name: row.name,
    originalName: row.original_name,
    category: row.category,
    lat: Number(row.lat),
    lng: Number(row.lng),
    rate: row.rate,
    touristRelevance: row.tourist_relevance,
    isFeatured: !!row.is_featured,
    distanceM: row.distance_m,
    source: row.source,
  };
}

function mapCurated(row: CuratedRow): CuratedAttraction {
  return {
    id: row.cur_id,
    name: row.name,
    originalName: row.original_name,
    category: row.category,
    lat: Number(row.lat),
    lng: Number(row.lng),
    city: row.city,
    admin1: row.admin1,
    countryCode: row.country_code,
  };
}

export const attractionRepository: AttractionRepository = {
  async listByDestination(destinationId: number): Promise<AttractionRecord[]> {
    const rows = await databaseClient.query<AttractionRow>(
      `SELECT att_id, destination_id, name, original_name, category, lat, lng,
              rate, tourist_relevance, is_featured, distance_m, source
         FROM attractions
        WHERE destination_id = ?
        ORDER BY is_featured DESC, tourist_relevance DESC, distance_m ASC`,
      [destinationId],
    );
    return rows.map(mapRow);
  },

  async saveAll(
    destinationId: number,
    items: NearbyAttraction[],
    source: string,
  ): Promise<void> {
    if (items.length === 0) return;
    const placeholders = items.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = items.flatMap((a) => [
      destinationId,
      a.name,
      a.originalName,
      a.category,
      a.lat,
      a.lng,
      a.rate,
      a.distanceM,
      a.touristRelevance,
      source,
      a.sourceId,
    ]);
    await databaseClient.execute(
      `INSERT INTO attractions
         (destination_id, name, original_name, category, lat, lng, rate,
          distance_m, tourist_relevance, source, source_id)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE att_id = att_id`,
      params,
    );
  },

  async listCurated(lookup: CuratedLookup): Promise<CuratedAttraction[]> {
    // Bounding-box prefilter (lat/lng degrees ≈ radius), precise distance
    // check happens in the service layer.
    const latDelta = lookup.radiusM / 111_320;
    const lngDelta = lookup.radiusM / Math.max(111_320 * Math.cos((lookup.lat * Math.PI) / 180), 1);
    const rows = await databaseClient.query<CuratedRow>(
      `SELECT cur_id, name, original_name, category, lat, lng, city, admin1, country_code
         FROM curated_attractions
        WHERE (LOWER(city) = LOWER(?) AND country_code = ?)
           OR (lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?)`,
      [
        lookup.city,
        lookup.countryCode ?? '',
        lookup.lat - latDelta,
        lookup.lat + latDelta,
        lookup.lng - lngDelta,
        lookup.lng + lngDelta,
      ],
    );
    return rows.map(mapCurated);
  },

  async findByIds(ids: number[]): Promise<AttractionRecord[]> {
    if (ids.length === 0) return [];
    const marks = ids.map(() => '?').join(', ');
    const rows = await databaseClient.query<AttractionRow>(
      `SELECT att_id, destination_id, name, original_name, category, lat, lng,
              rate, tourist_relevance, is_featured, distance_m, source
         FROM attractions
        WHERE att_id IN (${marks})`,
      ids,
    );
    return rows.map(mapRow);
  },

  async findCuratedByIds(ids: number[]): Promise<CuratedAttraction[]> {
    if (ids.length === 0) return [];
    const marks = ids.map(() => '?').join(', ');
    const rows = await databaseClient.query<CuratedRow>(
      `SELECT cur_id, name, original_name, category, lat, lng, city, admin1, country_code
         FROM curated_attractions
        WHERE cur_id IN (${marks})`,
      ids,
    );
    return rows.map(mapCurated);
  },
};
