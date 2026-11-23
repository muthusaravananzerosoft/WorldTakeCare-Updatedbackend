import type { ResultSetHeader } from 'mysql2/promise';
import { databaseClient, MysqlTransactionContext } from '../database/client.js';
import type {
  CreateTripInput,
  ItineraryDayInput,
  TripRecord,
  UpdateTripInput,
} from '../entities/trip.types.js';
import type { TransactionContext } from './database-client.interface.js';

export interface TripRepository {
  create(userId: number, input: CreateTripInput): Promise<TripRecord>;
  /** Trip + child lists, or null. */
  findById(id: number, tx?: TransactionContext): Promise<TripRecord | null>;
  listByUser(userId: number): Promise<TripRecord[]>;
  /** Partial update; child arrays replace when present. Null when id unknown. */
  update(id: number, input: UpdateTripInput): Promise<TripRecord | null>;
  delete(id: number): Promise<boolean>;
}

interface TripRow {
  trip_id: number;
  user_id: number;
  destination_id: number | null;
  start_date: string;
  end_date: string;
  trip_type: string | null;
  notes: string | null;
  accommodation: string | null;
  ec_name: string | null;
  ec_phone: string | null;
  ins_provider: string | null;
  ins_number: string | null;
  budget_amount: string | null;
  budget_currency: string | null;
  visibility: TripRecord['visibility'];
  status: TripRecord['status'];
  plan_mode: TripRecord['planMode'];
  /** LONGTEXT string on MariaDB; mysql2 may return a parsed value on MySQL. */
  itinerary: string | ItineraryDayInput[] | null;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `trip_id, user_id, destination_id,
    DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
    DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date,
    trip_type, notes, accommodation, ec_name, ec_phone,
    ins_provider, ins_number, budget_amount, budget_currency,
    visibility, status, plan_mode, itinerary, created_at, updated_at`;

type SqlParam = string | number | null;

/** Runs a read query inside `tx` when given, else on the pool. */
async function query<T>(sql: string, params: SqlParam[], tx?: TransactionContext): Promise<T[]> {
  if (tx instanceof MysqlTransactionContext) {
    const [rows] = await tx.connection.query(sql, params);
    return rows as T[];
  }
  return databaseClient.query<T>(sql, params);
}

function parseItinerary(raw: TripRow['itinerary']): ItineraryDayInput[] | null {
  if (raw === null || raw === '') return null;
  if (typeof raw === 'string') return JSON.parse(raw) as ItineraryDayInput[];
  return Array.isArray(raw) ? raw : null;
}

function mapRow(row: TripRow, interests: string[], dietary: string[]): TripRecord {
  return {
    id: row.trip_id,
    userId: row.user_id,
    destinationId: row.destination_id,
    startDate: row.start_date,
    endDate: row.end_date,
    tripType: row.trip_type,
    interests,
    notes: row.notes,
    accommodation: row.accommodation,
    dietaryPreferences: dietary,
    emergencyContactName: row.ec_name,
    emergencyContactPhone: row.ec_phone,
    insuranceProvider: row.ins_provider,
    insuranceNumber: row.ins_number,
    budgetAmount: row.budget_amount === null ? null : Number(row.budget_amount),
    budgetCurrency: row.budget_currency,
    visibility: row.visibility,
    status: row.status,
    planMode: row.plan_mode,
    itinerary: parseItinerary(row.itinerary),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function loadChildren(ids: number[], tx?: TransactionContext) {
  const byTrip = new Map<number, { interests: string[]; dietary: string[] }>();
  for (const id of ids) byTrip.set(id, { interests: [], dietary: [] });
  if (ids.length === 0) return byTrip;

  const marks = ids.map(() => '?').join(', ');
  const interestRows = await query<{ trip_id: number; interest: string }>(
    `SELECT trip_id, interest FROM trip_interests WHERE trip_id IN (${marks})`,
    ids,
    tx,
  );
  const dietaryRows = await query<{ trip_id: number; preference: string }>(
    `SELECT trip_id, preference FROM trip_dietary_preferences WHERE trip_id IN (${marks})`,
    ids,
    tx,
  );
  for (const r of interestRows) byTrip.get(r.trip_id)?.interests.push(r.interest);
  for (const r of dietaryRows) byTrip.get(r.trip_id)?.dietary.push(r.preference);
  return byTrip;
}

const FIELD_TO_COLUMN: Record<string, string> = {
  destinationId: 'destination_id',
  startDate: 'start_date',
  endDate: 'end_date',
  tripType: 'trip_type',
  notes: 'notes',
  accommodation: 'accommodation',
  visibility: 'visibility',
  planMode: 'plan_mode',
};

export const tripRepository: TripRepository = {
  async create(userId: number, input: CreateTripInput): Promise<TripRecord> {
    return databaseClient.transaction(async (tx) => {
      const conn = (tx as MysqlTransactionContext).connection;
      const [header] = await conn.execute<ResultSetHeader>(
        `INSERT INTO trips
           (user_id, destination_id, start_date, end_date, trip_type, notes,
            accommodation, ec_name, ec_phone, ins_provider, ins_number,
            budget_amount, budget_currency, visibility, plan_mode, itinerary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          input.destinationId,
          input.startDate,
          input.endDate,
          input.tripType ?? null,
          input.notes ?? null,
          input.accommodation ?? null,
          input.emergencyContact?.name ?? null,
          input.emergencyContact?.phone ?? null,
          input.insurance?.provider ?? null,
          input.insurance?.insuranceNumber ?? null,
          input.budget?.amount ?? null,
          input.budget?.currency ?? null,
          input.visibility,
          input.planMode,
          input.itinerary === undefined ? null : JSON.stringify(input.itinerary),
        ],
      );
      const tripId = Number(header.insertId);

      if (input.interests.length > 0) {
        await conn.query(
          `INSERT INTO trip_interests (trip_id, interest) VALUES ${input.interests.map(() => '(?, ?)').join(', ')}`,
          input.interests.flatMap((i) => [tripId, i]),
        );
      }
      if (input.dietaryPreferences.length > 0) {
        await conn.query(
          `INSERT INTO trip_dietary_preferences (trip_id, preference) VALUES ${input.dietaryPreferences.map(() => '(?, ?)').join(', ')}`,
          input.dietaryPreferences.flatMap((d) => [tripId, d]),
        );
      }

      const record = await tripRepository.findById(tripId, tx);
      if (!record) throw new Error('Trip insert failed');
      return record;
    });
  },

  async findById(id: number, tx?: TransactionContext): Promise<TripRecord | null> {
    const rows = await query<TripRow>(
      `SELECT ${SELECT_COLUMNS} FROM trips WHERE trip_id = ?`,
      [id],
      tx,
    );
    const row = rows[0];
    if (!row) return null;
    const children = await loadChildren([id], tx);
    const c = children.get(id)!;
    return mapRow(row, c.interests, c.dietary);
  },

  async listByUser(userId: number): Promise<TripRecord[]> {
    const rows = await databaseClient.query<TripRow>(
      `SELECT ${SELECT_COLUMNS} FROM trips WHERE user_id = ? ORDER BY start_date DESC, trip_id DESC`,
      [userId],
    );
    const children = await loadChildren(rows.map((r) => r.trip_id));
    return rows.map((row) => {
      const c = children.get(row.trip_id)!;
      return mapRow(row, c.interests, c.dietary);
    });
  },

  async update(id: number, input: UpdateTripInput): Promise<TripRecord | null> {
    return databaseClient.transaction(async (tx) => {
      const conn = (tx as MysqlTransactionContext).connection;
      const existing = await tripRepository.findById(id, tx);
      if (!existing) return null;

      const sets: string[] = [];
      const params: SqlParam[] = [];
      for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
        if (field in input) {
          sets.push(`${column} = ?`);
          params.push(((input as Record<string, unknown>)[field] as string | number | null) ?? null);
        }
      }
      if ('emergencyContact' in input) {
        sets.push('ec_name = ?', 'ec_phone = ?');
        params.push(input.emergencyContact?.name ?? null, input.emergencyContact?.phone ?? null);
      }
      if ('insurance' in input) {
        sets.push('ins_provider = ?', 'ins_number = ?');
        params.push(input.insurance?.provider ?? null, input.insurance?.insuranceNumber ?? null);
      }
      if ('budget' in input) {
        sets.push('budget_amount = ?', 'budget_currency = ?');
        params.push(input.budget?.amount ?? null, input.budget?.currency ?? null);
      }
      if ('itinerary' in input && input.itinerary !== undefined) {
        sets.push('itinerary = ?');
        params.push(JSON.stringify(input.itinerary));
      }
      if (sets.length > 0) {
        params.push(id);
        await conn.execute(`UPDATE trips SET ${sets.join(', ')} WHERE trip_id = ?`, params);
      }

      if (input.interests !== undefined) {
        await conn.execute('DELETE FROM trip_interests WHERE trip_id = ?', [id]);
        if (input.interests.length > 0) {
          await conn.query(
            `INSERT INTO trip_interests (trip_id, interest) VALUES ${input.interests.map(() => '(?, ?)').join(', ')}`,
            input.interests.flatMap((i) => [id, i]),
          );
        }
      }
      if (input.dietaryPreferences !== undefined) {
        await conn.execute('DELETE FROM trip_dietary_preferences WHERE trip_id = ?', [id]);
        if (input.dietaryPreferences.length > 0) {
          await conn.query(
            `INSERT INTO trip_dietary_preferences (trip_id, preference) VALUES ${input.dietaryPreferences.map(() => '(?, ?)').join(', ')}`,
            input.dietaryPreferences.flatMap((d) => [id, d]),
          );
        }
      }

      return tripRepository.findById(id, tx);
    });
  },

  async delete(id: number): Promise<boolean> {
    const result = await databaseClient.execute('DELETE FROM trips WHERE trip_id = ?', [id]);
    return result.affectedRows > 0;
  },
};
