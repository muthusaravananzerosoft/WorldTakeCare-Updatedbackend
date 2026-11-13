import type { DependencyStatus } from '../entities/health.types.js';

/**
 * Contract for the single shared database client (pool). The concrete
 * implementation is chosen once the team approves a database + driver/ORM
 * (see documentation/backend-architecture.md → "Decisions requiring approval").
 */
export interface DatabaseClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Cheap round-trip (e.g. `SELECT 1`) used by GET /api/v1/health. */
  ping(): Promise<DependencyStatus>;
  /** Runs `work` inside a transaction; rolls back if it throws. */
  transaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}

/** Opaque handle passed to repositories so several writes share one transaction. */
export interface TransactionContext {
  readonly id: string;
}
