import { randomUUID } from 'node:crypto';
import mysql, { type Pool, type PoolConnection, type ResultSetHeader } from 'mysql2/promise';
import { env } from '../config/env.config.js';
import type { DependencyStatus } from '../entities/health.types.js';
import type {
  DatabaseClient,
  TransactionContext,
} from '../repositories/database-client.interface.js';

/**
 * Carries the dedicated connection used inside a transaction. Repositories
 * receive this context and run their queries on `connection` so several
 * writes commit or roll back together.
 */
export class MysqlTransactionContext implements TransactionContext {
  readonly id = randomUUID();

  constructor(public readonly connection: PoolConnection) {}
}

/**
 * mysql2-backed DatabaseClient — the single shared connection pool.
 * The pool is created lazily so importing this module never opens a
 * connection (tests and non-DB runs stay clean).
 */
class MysqlDatabaseClient implements DatabaseClient {
  private pool: Pool | null = null;

  /** Verifies the configured database is reachable; throws if not. */
  async connect(): Promise<void> {
    await this.getPool().query('SELECT 1');
  }

  async disconnect(): Promise<void> {
    const pool = this.pool;
    this.pool = null;
    await pool?.end();
  }

  async ping(): Promise<DependencyStatus> {
    if (!env.DATABASE_URL) return 'not_configured';
    try {
      await this.getPool().query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  /** Parameterised query on the pool. Repositories use this for reads. */
  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const [rows] = await this.getPool().query(sql, params);
    return rows as T[];
  }

  /** Parameterised INSERT/UPDATE/DELETE; returns the driver result header (insertId, affectedRows). */
  async execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
    const [result] = await this.getPool().query<ResultSetHeader>(sql, params);
    return result;
  }

  async transaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const connection = await this.getPool().getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(new MysqlTransactionContext(connection));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private getPool(): Pool {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }
    this.pool ??= mysql.createPool({
      uri: env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: env.DATABASE_POOL_SIZE,
      queueLimit: 0,
    });
    return this.pool;
  }
}

/** Singleton shared by the whole process (one pool). */
export const databaseClient = new MysqlDatabaseClient();
