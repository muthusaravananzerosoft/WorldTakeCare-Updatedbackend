import type { TransactionContext } from './database-client.interface.js';

export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
}

/**
 * Base contract every module repository builds on. Services depend on these
 * interfaces only, never on a driver/ORM, so the storage engine can change
 * without touching business logic.
 */
export interface Repository<TEntity, TId, TCreate = Partial<TEntity>, TUpdate = Partial<TEntity>> {
  findById(id: TId, tx?: TransactionContext): Promise<TEntity | null>;
  findPage(request: PageRequest, tx?: TransactionContext): Promise<Page<TEntity>>;
  create(data: TCreate, tx?: TransactionContext): Promise<TEntity>;
  update(id: TId, data: TUpdate, tx?: TransactionContext): Promise<TEntity | null>;
  delete(id: TId, tx?: TransactionContext): Promise<boolean>;
}
