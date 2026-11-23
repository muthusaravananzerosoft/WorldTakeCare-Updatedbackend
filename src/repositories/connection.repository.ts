import { databaseClient } from '../database/client.js';
import type {
  ConnectionDetail,
  ConnectionListFilters,
  ConnectionRecord,
  ConnectionRequesterRole,
  ConnectionStatus,
} from '../entities/connection.types.js';
import type { Page, PageRequest } from './repository.interface.js';

export interface CreateConnectionData {
<<<<<<< HEAD
=======
  tripId: number | null;
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  memberId: number;
  guideId: number;
  requesterUserId: number;
  recipientUserId: number;
  requesterRole: ConnectionRequesterRole;
}

export interface ConnectionRepository {
  create(data: CreateConnectionData): Promise<ConnectionRecord>;
  /** Base row without joins — used by service-side rule checks. */
  findById(id: number): Promise<ConnectionRecord | null>;
<<<<<<< HEAD
  /** Row joined with member/guide display names. */
  findDetailById(id: number): Promise<ConnectionDetail | null>;
  /** The single row for a (member, guide) pair, any status. */
  findByPair(memberId: number, guideId: number): Promise<ConnectionRecord | null>;
=======
  /** Row joined with trip destination + member/guide display names. */
  findDetailById(id: number): Promise<ConnectionDetail | null>;
  /** The single row for a (trip, member, guide) pair, any status. tripId may be null. */
  findByPair(tripId: number | null, memberId: number, guideId: number): Promise<ConnectionRecord | null>;
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  /**
   * Re-opens a declined row as a fresh pending request (new requester side
   * allowed) — keeps one row per pair so no duplicates accumulate.
   */
  reopen(id: number, requesterUserId: number, recipientUserId: number, role: ConnectionRequesterRole): Promise<ConnectionRecord | null>;
  setStatus(id: number, status: ConnectionStatus): Promise<ConnectionRecord | null>;
  /** Rows where the user is the member or the guide, filtered + paginated. */
  findPageByUser(userId: number, filters: ConnectionListFilters, request: PageRequest): Promise<Page<ConnectionDetail>>;
}

interface ConnectionRow {
  conn_id: number;
<<<<<<< HEAD
=======
  trip_id: number | null;
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  member_id: number;
  guide_id: number;
  requester_user_id: number;
  recipient_user_id: number;
  requester_role: ConnectionRequesterRole;
  status: ConnectionStatus;
  requested_at: Date;
  responded_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ConnectionDetailRow extends ConnectionRow {
<<<<<<< HEAD
=======
  destination_id: number | null;
  destination_name: string | null;
  destination_country_code: string | null;
  destination_country_name: string | null;
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  member_fname: string;
  member_lname: string;
  guide_fname: string;
  guide_lname: string;
}

<<<<<<< HEAD
const SELECT_COLUMNS = `conn_id, member_id, guide_id,
    requester_user_id, recipient_user_id, requester_role, status,
    requested_at, responded_at, created_at, updated_at`;

const DETAIL_SELECT = `c.conn_id, c.member_id, c.guide_id,
    c.requester_user_id, c.recipient_user_id, c.requester_role, c.status,
    c.requested_at, c.responded_at, c.created_at, c.updated_at,
=======
const SELECT_COLUMNS = `conn_id, trip_id, member_id, guide_id,
    requester_user_id, recipient_user_id, requester_role, status,
    requested_at, responded_at, created_at, updated_at`;

const DETAIL_SELECT = `c.conn_id, c.trip_id, c.member_id, c.guide_id,
    c.requester_user_id, c.recipient_user_id, c.requester_role, c.status,
    c.requested_at, c.responded_at, c.created_at, c.updated_at,
    t.destination_id, d.name AS destination_name,
    d.country_code AS destination_country_code, d.country_name AS destination_country_name,
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
    m.fname AS member_fname, m.lname AS member_lname,
    g.fname AS guide_fname, g.lname AS guide_lname`;

const DETAIL_JOINS = `FROM connections c
<<<<<<< HEAD
=======
    LEFT JOIN trips t ON t.trip_id = c.trip_id
    LEFT JOIN destinations d ON d.dst_id = t.destination_id
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
    JOIN \`user\` m ON m.use_id = c.member_id
    JOIN \`user\` g ON g.use_id = c.guide_id`;

type SqlParam = string | number | null;

function mapRow(row: ConnectionRow): ConnectionRecord {
  return {
    id: row.conn_id,
<<<<<<< HEAD
=======
    tripId: row.trip_id,
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
    memberId: Number(row.member_id),
    guideId: Number(row.guide_id),
    requesterUserId: Number(row.requester_user_id),
    recipientUserId: Number(row.recipient_user_id),
    requesterRole: row.requester_role,
    status: row.status,
    requestedAt: row.requested_at.toISOString(),
    respondedAt: row.responded_at === null ? null : row.responded_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapDetail(row: ConnectionDetailRow): ConnectionDetail {
  return {
    ...mapRow(row),
<<<<<<< HEAD
=======
    tripDestination:
      row.destination_id === null
        ? null
        : {
            id: row.destination_id,
            name: row.destination_name ?? '',
            countryCode: row.destination_country_code,
            countryName: row.destination_country_name,
          },
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
    member: { id: Number(row.member_id), firstName: row.member_fname, lastName: row.member_lname },
    guide: { id: Number(row.guide_id), firstName: row.guide_fname, lastName: row.guide_lname },
  };
}

export const connectionRepository: ConnectionRepository = {
  async create(data) {
    const result = await databaseClient.execute(
      `INSERT INTO connections
<<<<<<< HEAD
         (member_id, guide_id, requester_user_id, recipient_user_id, requester_role)
       VALUES (?, ?, ?, ?, ?)`,
      [
=======
         (trip_id, member_id, guide_id, requester_user_id, recipient_user_id, requester_role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.tripId,
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
        data.memberId,
        data.guideId,
        data.requesterUserId,
        data.recipientUserId,
        data.requesterRole,
      ],
    );
    const created = await this.findById(Number(result.insertId));
    if (!created) throw new Error('Connection insert failed');
    return created;
  },

  async findById(id) {
    const rows = await databaseClient.query<ConnectionRow>(
      `SELECT ${SELECT_COLUMNS} FROM connections WHERE conn_id = ? LIMIT 1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  },

  async findDetailById(id) {
    const rows = await databaseClient.query<ConnectionDetailRow>(
      `SELECT ${DETAIL_SELECT} ${DETAIL_JOINS} WHERE c.conn_id = ? LIMIT 1`,
      [id],
    );
    const row = rows[0];
    return row ? mapDetail(row) : null;
  },

<<<<<<< HEAD
  async findByPair(memberId, guideId) {
    const rows = await databaseClient.query<ConnectionRow>(
      `SELECT ${SELECT_COLUMNS} FROM connections
        WHERE member_id = ? AND guide_id = ? LIMIT 1`,
      [memberId, guideId],
=======
  async findByPair(tripId, memberId, guideId) {
    const rows = await databaseClient.query<ConnectionRow>(
      `SELECT ${SELECT_COLUMNS} FROM connections
        WHERE trip_id <=> ? AND member_id = ? AND guide_id = ? LIMIT 1`,
      [tripId, memberId, guideId],
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  },

  async reopen(id, requesterUserId, recipientUserId, role) {
    await databaseClient.execute(
      `UPDATE connections
          SET requester_user_id = ?, recipient_user_id = ?, requester_role = ?,
              status = 'pending', requested_at = CURRENT_TIMESTAMP, responded_at = NULL
        WHERE conn_id = ? AND status = 'declined'`,
      [requesterUserId, recipientUserId, role, id],
    );
    return this.findById(id);
  },

  async setStatus(id, status) {
    await databaseClient.execute(
      `UPDATE connections
          SET status = ?, responded_at = CURRENT_TIMESTAMP
        WHERE conn_id = ? AND status = 'pending'`,
      [status, id],
    );
    return this.findById(id);
  },

  async findPageByUser(userId, filters, request) {
    const where: string[] = ['(c.member_id = ? OR c.guide_id = ?)'];
    const params: SqlParam[] = [userId, userId];

    if (filters.status) {
      where.push('c.status = ?');
      params.push(filters.status);
    }
    if (filters.type === 'sent') {
      where.push('c.requester_user_id = ?');
      params.push(userId);
    } else if (filters.type === 'received') {
      where.push('c.recipient_user_id = ?');
      params.push(userId);
    }
<<<<<<< HEAD
=======
    if (filters.tripId !== undefined) {
      where.push('c.trip_id = ?');
      params.push(filters.tripId);
    }

>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
    const clause = where.join(' AND ');
    const [countRows, rows] = await Promise.all([
      databaseClient.query<{ total: number }>(
        `SELECT COUNT(*) AS total FROM connections c WHERE ${clause}`,
        params,
      ),
      databaseClient.query<ConnectionDetailRow>(
        `SELECT ${DETAIL_SELECT} ${DETAIL_JOINS}
          WHERE ${clause}
          ORDER BY c.requested_at DESC, c.conn_id DESC
          LIMIT ? OFFSET ?`,
        [...params, request.pageSize, (request.page - 1) * request.pageSize],
      ),
    ]);

    return {
      items: rows.map(mapDetail),
      page: request.page,
      pageSize: request.pageSize,
      totalItems: Number(countRows[0]?.total ?? 0),
    };
  },
};
