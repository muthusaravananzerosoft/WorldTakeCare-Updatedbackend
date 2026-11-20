import { databaseClient } from '../database/client.js';
import type { DestinationKind, DestinationRecord } from '../entities/destination.types.js';

export interface DestinationInput {
  kind: DestinationKind;
  name: string;
  admin1: string | null;
  countryCode: string | null;
  countryName: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
  sourceId: string;
}

export interface DestinationRepository {
  findById(id: number): Promise<DestinationRecord | null>;
  /** Idempotent insert on (kind, source, source_id); returns the full row. */
  upsert(input: DestinationInput): Promise<DestinationRecord>;
  /** Fills in coordinates resolved later (legacy rows have none). */
  setCoordinates(id: number, lat: number, lng: number): Promise<void>;
}

interface DestinationRow {
  dst_id: number;
  kind: DestinationKind;
  name: string;
  admin1: string | null;
  country_code: string | null;
  country_name: string | null;
  lat: string | null;
  lng: string | null;
  source: string;
  source_id: string;
}

function mapRow(row: DestinationRow): DestinationRecord {
  return {
    id: row.dst_id,
    kind: row.kind,
    name: row.name,
    admin1: row.admin1,
    countryCode: row.country_code,
    countryName: row.country_name,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    source: row.source,
    sourceId: row.source_id,
  };
}

export const destinationRepository: DestinationRepository = {
  async findById(id: number): Promise<DestinationRecord | null> {
    const rows = await databaseClient.query<DestinationRow>(
      `SELECT dst_id, kind, name, admin1, country_code, country_name, lat, lng, source, source_id
         FROM destinations WHERE dst_id = ?`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async upsert(input: DestinationInput): Promise<DestinationRecord> {
    // INSERT IGNORE relies on uq_destination_source; the follow-up SELECT
    // returns the row whether it was just inserted or already existed.
    await databaseClient.execute(
      `INSERT IGNORE INTO destinations
         (kind, name, admin1, country_code, country_name, lat, lng, source, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.kind,
        input.name,
        input.admin1,
        input.countryCode,
        input.countryName,
        input.lat,
        input.lng,
        input.source,
        input.sourceId,
      ],
    );
    const rows = await databaseClient.query<DestinationRow>(
      `SELECT dst_id, kind, name, admin1, country_code, country_name, lat, lng, source, source_id
         FROM destinations WHERE kind = ? AND source = ? AND source_id = ?`,
      [input.kind, input.source, input.sourceId],
    );
    if (!rows[0]) throw new Error('Destination upsert failed');
    return mapRow(rows[0]);
  },

  async setCoordinates(id: number, lat: number, lng: number): Promise<void> {
    await databaseClient.execute(
      'UPDATE destinations SET lat = ?, lng = ? WHERE dst_id = ?',
      [lat, lng, id],
    );
  },
};
