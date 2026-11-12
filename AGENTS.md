# AGENTS.md — WorldTakeCare API

## Project

Standalone Node.js 24 + Express 5 + TypeScript (ESM, `NodeNext`) REST API. Backend only — the Next.js
frontend is in another repository. Legacy PHP reference (read-only, never modify):
`E:\MUTHU SARAVANAN\WorldTakeCare_Existing_PHPsource`.

## Commands

```bash
npm install
npm run dev          # tsx watch src/server.ts (port 4000)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
npm test             # vitest run
npm run build        # tsc -p tsconfig.build.json → dist/
npm start            # node dist/server.js
npm run verify       # typecheck + lint + test + build — run before finishing any change
```

## Conventions

- Relative imports use the `.js` extension (NodeNext ESM). Type-only imports use `import type`.
- Module layout and checklist: `src/modules/README.md`. Register routers only in `src/routes.ts`
  and keep `src/modules/module-registry.ts` + `src/docs/openapi.ts` in sync.
- Responses only through `sendSuccess` / `sendError`; throw `AppError` for expected failures.
- Validate every input with `validate({ params, query, body })` (Zod); read from `res.locals.validated`.
- Identity only from the verified token — never from request fields. No state changes via GET.
- No database driver/ORM until decision D-2 is approved (`documentation/backend-architecture.md` §10).
- Never copy credentials from the legacy source; secrets come from env vars (`src/config/env.config.ts`).

## Gotchas

- Windows: stopping a shell may leave the `node` server running — free port 4000 with
  `Get-NetTCPConnection -LocalPort 4000` / `Stop-Process`.
- Pinned versions: TypeScript 6.0.x (typescript-eslint requires < 6.1). `npm audit` reports moderate
  `minimatch` advisories in ESLint dev tooling only; production dependencies report 0.
- The legacy dump declares keys at the **end** of the file (`-- Indexes for dumped tables`), not in `CREATE TABLE`.
