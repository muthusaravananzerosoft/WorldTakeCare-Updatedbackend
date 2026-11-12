# Database layer

**Status: prepared, not connected.** No driver, ORM, models, migrations or
credentials exist yet — by design, until the team approves a target database.

## What exists

| Path | Purpose |
|---|---|
| `interfaces/database-client.interface.ts` | Contract for the one shared client/pool: `connect`, `disconnect`, `ping`, `transaction` |
| `interfaces/repository.interface.ts` | Base `Repository<T, Id>` contract and pagination types |
| `repositories/` | Will hold concrete repository implementations (one per module aggregate) |
| `migrations/` | Will hold schema migrations for the chosen tool |

## Legacy database (reference only — do not connect)

- MariaDB 10.11, database `worldtaker`, 41 tables, mixed MyISAM (20) / InnoDB (21), mixed `utf8mb3` / `latin1`.
- 35 tables have a primary key; 6 do not (`friend_request`, `online_users1`, `password_request`,
  `user_country_visited`, `user_photo`, `worldclock`). Few secondary indexes.
- **Only one foreign key** exists (`user_like.use_id/fuse_id → user.use_id ON DELETE CASCADE`).
  Every other relationship is implicit (naming convention `f<prefix>_id`) and unenforced; the
  data contains many orphan rows.
- Full analysis: [`documentation/database-analysis.md`](../../documentation/database-analysis.md).

## How to wire a database in (after approval)

1. Install the approved driver/ORM in this project only.
2. Add `DATABASE_URL` (and pool settings) to `src/config/env.config.ts` and `.env.example`.
3. Implement `DatabaseClient` in `src/database/client.ts` (one instance, created at startup).
4. Call `connect()` in `server.ts` before `listen`, and `disconnect()` in the shutdown handler.
5. Report `ping()` in `modules/health/health.service.ts` (`checks.database`).
6. Implement repositories in `repositories/` against the interfaces; services receive them by injection.
7. Put migrations in `migrations/` (or where the chosen tool expects them). The first migration
   should reproduce the **target** schema in `documentation/database-analysis.md` §7, not the legacy one.
8. Use a separate test database; never point tests at production or the legacy DB.

## Rules

- Services never import a driver/ORM directly — only repository interfaces.
- No raw string-concatenated SQL. Parameterised queries only (the legacy app's SQL injection
  surface must not be reproduced).
- Passwords are never stored with MD5. Legacy MD5 hashes are migrated via rehash-on-login
  (see `documentation/migration-mapping.md` → Authentication).
