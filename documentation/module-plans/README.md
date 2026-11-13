# Modules

These planning notes are organized by business capability. The authoritative list — with the legacy PHP files
and tables each module replaces — is [`module-registry.ts`](../../src/common/constants/module-registry.ts).
Every planned feature has a `README.md` describing the legacy behaviour it must preserve,
the endpoints it will expose, and legacy bugs it must **not** reproduce.

Only `health` has been implemented. These files are planning documentation, not source modules.

## File convention (when a module is implemented)

```
src/routes/<name>.routes.ts
src/controllers/<name>.controller.ts
src/services/<name>.service.ts
src/repositories/<name>.repository.ts
src/validators/<name>.validation.ts
src/entities/<name>.types.ts
```

## Checklist to implement a module

1. Write `*.validation.ts` and `*.types.ts`.
2. Write the service against a repository interface; unit-test it with an in-memory fake.
3. Write controller + routes; mount the router in `src/routes/index.ts` at the registry `basePath`.
4. Add the paths to `src/routes/openapi.ts`.
5. Set `status: 'implemented'` in `src/common/constants/module-registry.ts`.
6. Add supertest coverage in `tests/`.
7. Update `documentation/migration-mapping.md` (migration status column).

## Cross-cutting rules

- Authenticated identity comes **only** from the verified access token — never from a
  request field like `use_id` (legacy bug B-06).
- Whitelist writable fields in Zod schemas — never pass a request body straight to a
  repository (legacy bug B-07, mass assignment of `roles`).
- State changes use POST/PUT/PATCH/DELETE, never GET (legacy bug B-05).
