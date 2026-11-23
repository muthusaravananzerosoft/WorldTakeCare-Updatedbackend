import { USER_ROLES, type UserRole } from '../common/constants/auth.constants.js';
import { databaseClient } from '../database/client.js';
import type { AccountStatus, UserRecord } from '../entities/auth.types.js';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  /** Legacy encoding: 1 = male, 2 = female. */
  sexCode: number;
  /** Legacy `dob` column stores Unix epoch seconds. */
  dobEpoch: number;
  /** `countries.con_id`, or null when the code is unknown. */
  countryId: number | null;
  role: UserRole;
  registeredIp?: string | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: number): Promise<UserRecord | null>;
  findCountryIdByCode(code: string): Promise<number | null>;
  create(data: CreateUserData): Promise<UserRecord>;
  setActive(id: number): Promise<void>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
  updateEmail(id: number, email: string): Promise<void>;
  touchLastLogin(id: number): Promise<void>;
}

interface UserRow {
  use_id: number;
  email: string;
  password: string;
  fname: string;
  lname: string;
  role: string | null;
  roles: number;
  active: number;
  isdel: number;
  suspend: number;
}

const SELECT_COLUMNS = 'use_id, email, password, fname, lname, role, roles, active, isdel, suspend';

function mapStatus(row: UserRow): AccountStatus {
  if (row.isdel) return 'deleted';
  if (row.suspend) return 'suspended';
  if (!row.active) return 'pending';
  return 'active';
}

/** New `role` column wins; legacy `roles` tinyint (1 = admin) is the fallback for migrated rows. */
function mapRole(row: UserRow): UserRole {
  if (row.role === 'guide' || row.role === 'admin') return row.role;
  // 'member' is the current name; 'user' covers rows written before the rename.
  if (row.role === 'member' || row.role === 'user') return USER_ROLES.MEMBER;
  return row.roles === 1 ? USER_ROLES.ADMIN : USER_ROLES.MEMBER;
}

function mapRow(row: UserRow): UserRecord {
  return {
    id: row.use_id,
    email: row.email,
    passwordHash: row.password,
    firstName: row.fname,
    lastName: row.lname,
    role: mapRole(row),
    status: mapStatus(row),
  };
}

const epochSeconds = () => Math.floor(Date.now() / 1000);

/** MySQL implementation over the legacy `user` table + `countries` reference data. */
export const userRepository: UserRepository = {
  async findByEmail(email) {
    const rows = await databaseClient.query<UserRow>(
      `SELECT ${SELECT_COLUMNS} FROM \`user\` WHERE email = ? LIMIT 1`,
      [email],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  },

  async findById(id) {
    const rows = await databaseClient.query<UserRow>(
      `SELECT ${SELECT_COLUMNS} FROM \`user\` WHERE use_id = ? LIMIT 1`,
      [id],
    );
    const row = rows[0];
    return row ? mapRow(row) : null;
  },

  async findCountryIdByCode(code) {
    const rows = await databaseClient.query<{ con_id: number }>(
      'SELECT con_id FROM countries WHERE code = ? LIMIT 1',
      [code],
    );
    return rows[0]?.con_id ?? null;
  },

  async create(data) {
    const result = await databaseClient.execute(
      `INSERT INTO \`user\`
        (username, email, password, fname, lname, sex, dob, active, isdel, suspend,
         role, roles, registered, registered_ip, fadd1_con_id)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 3, ?, ?, ?)`,
      [
        data.email,
        data.passwordHash,
        data.firstName,
        data.lastName,
        data.sexCode,
        data.dobEpoch,
        data.role,
        String(epochSeconds()),
        data.registeredIp ?? null,
        data.countryId,
      ],
    );
    const created = await this.findById(Number(result.insertId));
    if (!created) throw new Error('User insert succeeded but row could not be read back');
    return created;
  },

  async setActive(id) {
    await databaseClient.execute(
      'UPDATE `user` SET active = 1, activated_date = ? WHERE use_id = ?',
      [epochSeconds(), id],
    );
  },

  async updatePassword(id, passwordHash) {
    await databaseClient.execute('UPDATE `user` SET password = ? WHERE use_id = ?', [
      passwordHash,
      id,
    ]);
  },

  async updateEmail(id, email) {
    await databaseClient.execute('UPDATE `user` SET email = ? WHERE use_id = ?', [email, id]);
  },

  async touchLastLogin(id) {
    await databaseClient.execute('UPDATE `user` SET last_logged = ? WHERE use_id = ?', [
      epochSeconds(),
      id,
    ]);
  },
};
