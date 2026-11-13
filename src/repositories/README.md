# Repositories

Concrete implementations of `Repository<T, Id>` (and module-specific query methods)
live here once a database is approved — e.g. `user.repository.ts`, `friendship.repository.ts`.

Each repository:

- implements an interface declared alongside the service layer that uses it;
- maps database rows to module types (no driver row types leak into services);
- accepts an optional `TransactionContext` for multi-write operations.

The `DatabaseClient` and generic `Repository` contracts are also defined in this folder.
No implementation exists until the database decision is made.
