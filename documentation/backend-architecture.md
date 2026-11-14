# WorldTakeCare backend architecture

Standalone **Node.js 24 + Express 5 + TypeScript** REST API. It replaces the PHP backend of
WorldTaker and is consumed by the Next.js web app (separate repository/team) and, later, Android/iOS apps.
The design is driven by the legacy analysis ([existing-project-analysis.md](./existing-project-analysis.md)).

## 1. Principles

1. **Behaviour-compatible, not code-compatible** — legacy rules are re-implemented; no PHP is ported.
2. **Client-agnostic REST** — JSON only, versioned (`/api/v1`), no HTML, no server sessions tied to a browser.
3. **Layered structure** — routes → controllers → services → repositories; each layer has one job.
4. **Secure by default** — validation on every input, identity only from verified tokens, no secrets in code.
5. **Storage-agnostic until decided** — services depend on repository interfaces (`src/repositories`).
6. **Explicit boundaries** for things that change independently: integrations, realtime, AI.

## 2. Directory layout

```
WorldTakeCare/
├── src/
│   ├── server.ts                    # process entry: listen, graceful shutdown, process-level error hooks
│   ├── app.ts                       # createApp(): middleware pipeline, docs, routes, 404, errors (no listen → testable)
│   ├── routes/
│   │   ├── index.ts                 # central /api/v1 route registration
│   │   ├── health.routes.ts
│   │   └── openapi.ts               # OpenAPI 3.1 document served by Swagger UI
│   ├── controllers/                 # HTTP controllers (health implemented)
│   ├── services/                    # business logic (health implemented)
│   ├── repositories/                # repository and database-client contracts; implementations later
│   ├── validators/                  # Zod request schemas
│   ├── entities/                    # domain and response types
│   ├── config/
│   │   ├── env.config.ts            # loads .env (Node built-in), validates with Zod, fails fast
│   │   ├── app.config.ts            # derived, typed runtime config
│   │   ├── cors.config.ts           # origin allow-list
│   │   └── index.ts
│   ├── common/
│   │   ├── constants/               # API prefix/version, HTTP status, error codes
│   │   ├── errors/app-error.ts      # operational error type (+ factories)
│   │   ├── interfaces/              # response envelope types
│   │   ├── responses/api-response.ts# sendSuccess / sendError
│   │   ├── types/express.d.ts       # req.id, res.locals.validated typing
│   │   └── utils/async-handler.ts
│   ├── middleware/
│   │   ├── request-id.middleware.ts # X-Request-Id correlation
│   │   ├── request-logger.middleware.ts (morgan)
│   │   ├── validate.middleware.ts   # Zod validation of params/query/body
│   │   ├── not-found.middleware.ts
│   │   └── error.middleware.ts      # the only place errors become HTTP responses
│   ├── database/README.md            # database decision and setup notes; no live connection
│   ├── common/constants/             # API/status/error constants and feature registry
│   ├── integrations/                # adapters for mail, social auth, video, captcha, geoip, storage
│   ├── realtime/                    # WebSocket layer (chat, presence, calls, badge counts)
│   ├── ai/                          # reserved boundary (no AI in legacy)
├── tests/                           # Vitest + Supertest
├── documentation/                   # analysis, architecture and feature plans
│   └── module-plans/                # planned feature details (not source modules)
├── .env.example · package.json · tsconfig*.json · eslint.config.js · vitest.config.ts · .prettierrc.json
└── README.md · AGENTS.md
```

Feature plans map to confirmed legacy behavior (see the registry and
[migration-mapping.md](./migration-mapping.md)). Features from the requested template that have **no
legacy evidence** were not created as business modules: `subscriptions` (no payments exist), `matches`
(no matching exists — folded into `likes` as decision D-7) and `preferences` (only `looking_to_meet`,
which belongs to `profiles`). Evidence-based modules **added**: `friends`, `favorites`, `chat`,
`video-calls`, `presence`, `travel`, `posts`, `blog`, `content`, `contact`, `reference-data`.

## 3. Request pipeline (`src/app.ts`)

| # | Middleware | Responsibility |
|---|---|---|
| 1 | `requestIdMiddleware` | Reuse a safe incoming `X-Request-Id` or generate a UUID; echo it in the response |
| 2 | `requestLoggerMiddleware` | Access log incl. request id (silent in tests) |
| 3 | `helmet()` | Security headers; `x-powered-by` disabled |
| 4 | `cors(corsOptions)` | Allow-listed browser origins, credentials, `X-Request-Id` exposed; no-Origin clients (mobile, curl) allowed |
| 5 | `express.json` / `urlencoded` | Body parsing with size limit (`JSON_BODY_LIMIT`) |
| 6 | Swagger (`/api/docs`, `/api/docs.json`) | Only when docs are enabled (default off in production); CSP relaxed on that route only |
| 7 | `/api/v1` → `apiRouter` | Module routers; per-route `validate()` |
| 8 | `notFoundMiddleware` | JSON 404 `ROUTE_NOT_FOUND` |
| 9 | `errorMiddleware` | `AppError` → its status/code; Zod → 400; bad JSON → 400; too large → 413; anything else → 500 (message hidden in production, logged with request id) |

## 4. Module layering

```
HTTP ─► routes/<name>.routes.ts ─► validate(schemas) ─► controllers/<name>.controller.ts ─► services/<name>.service.ts ─► repositories
                                                        │                       │                      │
                                              res.locals.validated     business rules,          implemented in
                                              sendSuccess()            throws AppError          src/repositories
                                                                       uses integrations/*
```

- Controllers never touch the database; services never touch `req`/`res`.
- Services receive dependencies (repositories, mailers) by parameter/factory → unit-testable with fakes.
- Cross-module calls go service → service (e.g. `likes.service` → `notifications.service`), never through HTTP.

## 5. Authentication & authorization (planned — D-1)

Recommended: **short-lived JWT access token (15 min) + rotating opaque refresh token (30 days)** stored
hashed in the database. Web: refresh token in an `httpOnly; Secure; SameSite=Lax` cookie; mobile: secure storage.
Middleware `requireAuth` sets `req.user = { id, role }`; `requireRole('admin')` guards `/admin`.
Passwords: Argon2id; legacy MD5 hashes verified once and rehashed (migration-mapping §5).
Account states checked on every token refresh: pending, active, suspended, deleted.

## 6. Data access (prepared — D-2)

- `DatabaseClient` (connect/disconnect/ping/transaction) and `Repository<T, Id>` contracts exist in `src/repositories`.
- Implemented as `databaseClient` (`src/database/client.ts`) — a mysql2 pool configured by
  `DATABASE_URL`/`DATABASE_POOL_SIZE`. Health reports `checks.database`; shutdown disconnects.
- Target database is **MariaDB/MySQL** (matches legacy); the local `worldtakecare` DB is a
  structure-only clone of the legacy schema, adjusted per requirements.
- No migration tool or schema migrations yet — see `documentation/database-migrations.md`.

**Original recommendation (superseded by the MySQL decision):** PostgreSQL 16+ with a type-safe query layer (Drizzle ORM or Kysely),
because the target model needs real FKs, transactions, `timestamptz`, JSON, full-text and geo queries (PostGIS
for zip-radius search). Staying on MariaDB is viable (the legacy is MariaDB 10.11 and the dataset is small);
in that case use InnoDB + `utf8mb4` everywhere and the same query layer. The ETL is required either way
because the schema is being normalised.

## 7. Realtime, integrations, AI

- `src/realtime/README.md` — WebSocket events replacing legacy polling (chat, presence, calls, badges).
- `src/integrations/README.md` — adapters for every confirmed external service; secrets via env only.
- `src/ai/README.md` — reserved; nothing in legacy.

## 8. Scalability

- Stateless API process → horizontal scaling behind a load balancer (`TRUST_PROXY`).
- Shared state (rate limits, presence, socket fan-out) moves to Redis when more than one instance runs (D-17).
- Media served from object storage/CDN, not the API.
- Mobile apps use the same `/api/v1` contract; breaking changes go to `/api/v2`.

## 9. Configuration

All configuration comes from environment variables validated at startup (`src/config/env.config.ts`).
Invalid or missing required values stop the process with a readable list of problems. Reserved
future variables are listed (commented) in `.env.example`.

## 10. Decisions requiring team approval

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| D-1 | Auth mechanism | JWT access + refresh / server sessions + cookie | JWT + rotating refresh (works for web and mobile) |
| D-2 | Target database + data-access library | PostgreSQL / MariaDB; Drizzle / Kysely / Prisma | PostgreSQL + Drizzle or Kysely |
| D-3 | Keep legacy member ids | reuse as PK / new UUID + `legacy_id` | Keep numeric ids (URLs `/user/{id}` and media paths depend on them) |
| D-4 | Media storage | S3 / Cloudflare R2 / local disk | S3-compatible object storage + CDN |
| D-5 | Social providers to keep | Google, Apple, Microsoft, Facebook, Twitter/X | Google + Apple (+ Facebook if still used); drop Twitter OAuth 1.0a |
| D-6 | Messaging model | keep `messages` + `chat` separate / unify into conversations | Unify (one conversation model, realtime delivery) |
| D-7 | Matching | none (legacy) / mutual like = match | Product decision |
| D-8 | Blocking & reporting | not in legacy | **Strongly recommended** before launch for a dating product |
| D-9 | Notification centre & push | email + badges only / in-app feed / push | In-app feed + push for mobile |
| D-10 | Subscriptions/payments | none (legacy is free) | Keep free unless product decides otherwise |
| D-11 | Video provider & 60-second limit | VideoSDK / other; limit kept or removed | Keep VideoSDK, confirm limit |
| D-12 | Birthday emails | keep / drop | Keep, opt-out, in-house job |
| D-13 | CMS pages & blog | API module / Next.js static / headless CMS | Static pages in Next.js; blog only if still wanted |
| D-14 | Newsletter (Mailchimp present, unused) | add / drop | Drop for now |
| D-15 | Migrate pending (`user_tmp`) registrations | yes / no | No — ask them to sign up again |
| D-16 | Migrate old messages/chat/contact rows | all / since date / none | Messages & chat since a cut-off date; drop contact spam |
| D-17 | Hosting & Redis | VPS / PaaS / containers | Container platform + managed DB + Redis |
| D-18 | Email delivery | current SMTP / transactional provider | Transactional provider (deliverability, bounces) |
| D-19 | Shared API types with the frontend repo | OpenAPI-generated client / shared npm package | Generate the client from `/api/docs.json` |
| D-20 | Secret rotation & removal of public dumps/logs on the live PHP server | — | **Do immediately** (owner action, independent of migration) |
