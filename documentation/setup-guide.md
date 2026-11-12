# Backend setup and execution guide

## Prerequisites

- Node.js **24+** (`.nvmrc` = 24; verified on 24.15.0) and npm 11
- Git

## First run

```bash
cd "E:/MUTHU SARAVANAN/WorldTakeCare"
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

The server prints:

```
WorldTakeCare API listening on http://localhost:4000/api/v1 (development)
Swagger UI: http://localhost:4000/api/docs
```

Check it:

```bash
curl http://localhost:4000/api/v1/health
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start with `tsx watch` (TypeScript directly, restarts on change) |
| `npm run build` | Compile `src/` → `dist/` with `tsc` (`tsconfig.build.json`) |
| `npm start` | Run the compiled build (`node dist/server.js`) — production mode |
| `npm run typecheck` | Type-check `src/` and `tests/` without emitting |
| `npm run lint` / `lint:fix` | ESLint (flat config, typescript-eslint) |
| `npm run format` / `format:check` | Prettier |
| `npm test` / `test:watch` | Vitest + Supertest |
| `npm run verify` | typecheck → lint → test → build (use before every commit/PR) |

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `4000` | |
| `CORS_ORIGINS` | **yes** | — | comma-separated URLs, e.g. `http://localhost:3000,https://worldtakecare.com` |
| `API_DOCS_ENABLED` | no | on except in production | `true` \| `false` |
| `LOG_FORMAT` | no | `dev` | morgan format: `dev`, `combined`, `common`, `short`, `tiny` |
| `JSON_BODY_LIMIT` | no | `1mb` | |
| `TRUST_PROXY` | no | `false` | `true`, `false`, or number of proxy hops |
| `SHUTDOWN_TIMEOUT_MS` | no | `10000` | forced exit after graceful-shutdown timeout |

`.env` is loaded with Node's built-in `process.loadEnvFile` (no dotenv). Real environment variables
take precedence. Invalid configuration stops the process with a readable message, e.g.:

```
Error: Invalid environment configuration:
  - CORS_ORIGINS: CORS_ORIGINS is required (comma-separated list of allowed origins)
```

## Production

```bash
npm ci
npm run build
NODE_ENV=production CORS_ORIGINS=https://<web-host> PORT=4000 npm start
```

Swagger is disabled in production unless `API_DOCS_ENABLED=true`. Send `SIGTERM`/`SIGINT` for a graceful
shutdown (stops accepting connections, finishes in-flight requests, exits; forced after `SHUTDOWN_TIMEOUT_MS`).

## Connecting the Next.js frontend (other repository)

- Frontend env: `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1`.
- Add the frontend origin to `CORS_ORIGINS`.
- Generate a typed client from `http://localhost:4000/api/docs.json` (decision D-19).

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Port 4000 is already in use` | Stop the other process or set `PORT` |
| `Invalid environment configuration` | Fix the listed variables in `.env` |
| Browser shows CORS error / API returns `CORS_NOT_ALLOWED` | Add the exact origin (scheme + host + port) to `CORS_ORIGINS` |
| Windows: server keeps running after closing the terminal | `Get-NetTCPConnection -LocalPort 4000` → `Stop-Process -Id <pid>` |

## Database

Not connected yet — see [`src/database/README.md`](../src/database/README.md) and decision D-2.
**Never point this project at the legacy `worldtaker` production database.**
