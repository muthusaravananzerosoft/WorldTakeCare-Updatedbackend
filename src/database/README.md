# Database layer

**Status: connected (mysql2), schema still the legacy clone.** `client.ts` implements the
`DatabaseClient` contract (`connect` / `disconnect` / `ping` / `transaction` / `query`) with a
shared mysql2 pool, configured by `DATABASE_URL` + `DATABASE_POOL_SIZE` (see
`src/config/env.config.ts`). The target database is currently **MariaDB/MySQL** — the local
`worldtakecare` DB is a structure-only clone of the legacy schema which will be adjusted per
requirements (see `documentation/migration-mapping.md`).

## What exists

- `src/database/client.ts` — `databaseClient` singleton (one pool for the process, lazy-created).
- `src/repositories/` — `DatabaseClient`, `TransactionContext` and generic `Repository<T>`
  contracts. No repository implementations yet.
- `src/server.ts` — calls `connect()` before listening (logs and continues on failure so health
  can report `down`) and `disconnect()` during graceful shutdown.
- `src/services/health.service.ts` — reports `checks.database` as `up` / `down` / `not_configured`.

## Legacy database (reference only — do not connect)

- MariaDB 10.11, database `worldtaker`, 41 tables, mixed MyISAM (20) / InnoDB (21), mixed `utf8mb3` / `latin1`.
- 35 tables have a primary key; 6 do not (`friend_request`, `online_users1`, `password_request`,
  `user_country_visited`, `user_photo`, `worldclock`). Few secondary indexes.
- **Only one foreign key** exists (`user_like.use_id/fuse_id → user.use_id ON DELETE CASCADE`).
  Every other relationship is implicit (naming convention `f<prefix>_id`) and unenforced; the
  data contains many orphan rows.
- Full analysis: [`documentation/database-analysis.md`](../../documentation/database-analysis.md).

## How repositories should use the client

1. Services depend on repository **interfaces**, not on `databaseClient` directly.
2. Repository implementations call `databaseClient.query()` for reads, and run multi-write
   operations inside `databaseClient.transaction(tx => ...)` using the
   `MysqlTransactionContext.connection`.
3. Migrations go through the approved migration tool once decided
   (`documentation/database-migrations.md`). The target schema is the adjusted one,
   not the raw legacy clone.
4. Use a separate test database; never point tests at production or the legacy DB.

## Rules

- Services never import `mysql2` directly — only repositories do.
- No raw string-concatenated SQL. Parameterised queries only (`?` placeholders) — the legacy
  app's SQL injection surface must not be reproduced.
- Passwords are never stored with MD5. Legacy MD5 hashes are migrated via rehash-on-login
  (see `documentation/migration-mapping.md` → Authentication).
