# Modules

One folder per business capability. The authoritative list — with the legacy PHP files
and tables each module replaces — is [`module-registry.ts`](./module-registry.ts).
Every planned module has a `README.md` describing the legacy behaviour it must preserve,
the endpoints it will expose, and legacy bugs it must **not** reproduce.

Only `health` is implemented. Other folders intentionally contain no code yet
(no empty placeholder files).

## File convention (when a module is implemented)

```
src/modules/<name>/
  <name>.routes.ts       # Router: paths → validate() → controller. No logic.
  <name>.controller.ts   # HTTP only: read res.locals.validated, call service, sendSuccess().
  <name>.service.ts      # Business rules. Throws AppError. No req/res, no SQL.
  <name>.repository.ts   # Repository interface the service depends on (implementation in src/database/repositories).
  <name>.validation.ts   # Zod schemas for params/query/body.
  <name>.types.ts        # DTOs and domain types.
  README.md
```

## Checklist to implement a module

1. Write `*.validation.ts` and `*.types.ts`.
2. Write the service against a repository interface; unit-test it with an in-memory fake.
3. Write controller + routes; mount the router in `src/routes.ts` at the registry `basePath`.
4. Add the paths to `src/docs/openapi.ts`.
5. Set `status: 'implemented'` in `module-registry.ts`.
6. Add supertest coverage in `tests/`.
7. Update `documentation/migration-mapping.md` (migration status column).

## Cross-cutting rules

- Authenticated identity comes **only** from the verified access token — never from a
  request field like `use_id` (legacy bug B-06).
- Whitelist writable fields in Zod schemas — never pass a request body straight to a
  repository (legacy bug B-07, mass assignment of `roles`).
- State changes use POST/PUT/PATCH/DELETE, never GET (legacy bug B-05).
