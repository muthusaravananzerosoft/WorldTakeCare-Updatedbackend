# WorldTakeCare API

Backend for **WorldTakeCare**, the successor of the legacy *WorldTaker* PHP dating/travel-meetup site
("Meet a Foreigner In Your Hometown"). Node.js 24 · Express 5 · TypeScript · REST (`/api/v1`).

This repository contains **only the backend**. The Next.js frontend lives in a separate repository.

## Status

| Area | State |
|---|---|
| Legacy analysis (code + database) | ✅ complete — see `documentation/` |
| Server skeleton (config, CORS, security headers, logging, validation, errors, 404, graceful shutdown) | ✅ |
| Middleware (rate limits, uploads, requireAuth/requireRole seam) | ✅ |
| Integration adapter interfaces (mail, social, storage, video, captcha, geoip, chat, maps, AI) | ✅ interfaces — implementations need API keys |
| `GET /api/v1/health` + Swagger/OpenAPI | ✅ |
| Business features (20) | 🧱 plans in `documentation/module-plans/`; registered in `src/common/constants/module-registry.ts` |
| Database | 🔌 mysql2 pool connected (`src/database/client.ts`); local `worldtakecare` DB = legacy-clone schema, adjusted per requirements |
| Auth, realtime, integrations | ⏸ boundaries documented; implementation is the next phase |

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
# → http://localhost:4000/api/v1/health
# → http://localhost:4000/api/docs
```

`npm run verify` runs typecheck, lint, tests and build. Full guide: [documentation/setup-guide.md](documentation/setup-guide.md).

## Documentation

| Document | Contents |
|---|---|
| [existing-project-analysis.md](documentation/existing-project-analysis.md) | Legacy structure, architecture, request flows, auth, integrations, uploads, bug catalogue B-01…B-32 |
| [feature-analysis.md](documentation/feature-analysis.md) | Feature inventory F-01…F-22 with files, tables, rules, validations |
| [database-analysis.md](documentation/database-analysis.md) | 41 tables, every column, keys, relationships, ER diagram, data quality, target model |
| [migration-mapping.md](documentation/migration-mapping.md) | PHP → module mapping, rules to preserve, validations, redesigns, ETL plan |
| [backend-architecture.md](documentation/backend-architecture.md) | Layout, pipeline, layering, auth/data plans, **decisions D-1…D-20** |
| [api-architecture.md](documentation/api-architecture.md) | Versioning, envelope, status codes, conventions, planned endpoint map |
| [setup-guide.md](documentation/setup-guide.md) | Install, scripts, env vars, production, troubleshooting |

## Structure

```
src/
  app.ts  server.ts
  config/       environment, application and CORS configuration
  routes/       route registration, health route and OpenAPI document
  controllers/  HTTP controllers
  services/     business logic (health implemented)
  repositories/ database and repository contracts
  validators/   request validation schemas
  entities/     domain and response types
  middleware/   request id, logging, validation, not-found and errors
  database/     database decision and integration notes
  common/       constants, errors, interfaces, responses, types and utilities
  integrations/ realtime/ ai/   future integration boundaries
tests/          Vitest + Supertest
documentation/  legacy analysis, architecture and feature plans
```

## Security notes

- The legacy PHP source contains live credentials. **Nothing was copied.** All of them must be rotated (decision D-20).
- Never connect this project to the legacy production database.
- `.env` is git-ignored; only `.env.example` is tracked.
# WorldTakeCare-backend
Backend source code
