# Repositories

Concrete implementations of `Repository<T, Id>` (and module-specific query methods)
live here once a database is approved — e.g. `user.repository.ts`, `friendship.repository.ts`.

Each repository:

- implements an interface declared next to the module that uses it (`src/modules/<name>/<name>.repository.ts`
  declares the interface; this folder provides the driver-specific implementation);
- maps database rows to module types (no driver row types leak into services);
- accepts an optional `TransactionContext` for multi-write operations.

Empty until the database decision is made.
