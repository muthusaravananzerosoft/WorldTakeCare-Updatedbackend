# Featured Countries — top tourist countries

Status: **implemented** (v1)

## Purpose

Curated "top tourist countries" cards for the website: one landmark
photo, a one-line description and exactly 3 keywords per country. Data is
seeded once (country codes verified against the local `countries` table +
photos from Unsplash) and served from our own DB — no external calls on
the request path.

## Endpoints

| Method | Path                                   | Auth    | Description                    |
| ------ | -------------------------------------- | ------- | ------------------------------ |
| GET    | `/api/v1/featured-countries?q=&page=&limit=` | public | Paginated active countries  |
| GET    | `/api/v1/featured-countries/:id`       | public  | One country (active only)      |
| POST   | `/api/v1/admin/featured-countries`     | admin   | Add a country                  |
| PATCH  | `/api/v1/admin/featured-countries/:id` | admin   | Update fields incl. `isActive` |
| DELETE | `/api/v1/admin/featured-countries/:id` | admin   | Hard delete (or PATCH isActive=false to deactivate) |

## Rules

- `keywords` must be **exactly 3** entries.
- Image fields are nullable — a row saved with `is_active=0` means
  "needs manual image review".
- Public endpoints only return `is_active=1` rows ordered by
  `display_order`.
- `country_code` is UNIQUE → imports and creates are idempotent/conflict-checked.
- Responses include `attribution.photographerName` +
  `photographerUrl` — the frontend MUST render the Unsplash +
  photographer credit (API terms) next to the image.

## Table

`featured_countries` — see `database/migrations/2026-11-20a_featured_countries.sql`.
Images are stored as hotlinked Unsplash URLs + attribution metadata —
never binary data.

## Seed import

```bash
# requires UNSPLASH_ACCESS_KEY in .env
npx tsx scripts/seed-featured-countries.ts                # all ~96 seeds
npx tsx scripts/seed-featured-countries.ts --offset 0 --limit 45
npx tsx scripts/seed-featured-countries.ts --force        # re-fetch images
```

Per country: the local `countries` table verifies the code → Unsplash
search fetches 5 candidates → each candidate is scored against
landmark/country tokens (first hit is NOT trusted blindly) → best
verified photo is saved with attribution and its `download_location`
pinged per Unsplash guidelines; unverifiable countries are saved
`is_active=0` for manual review. Upsert by `country_code` makes re-runs
safe.

Unsplash demo apps: **50 requests/hour** (until production-approved) —
batch with `--limit`/`--offset`. Keys: https://unsplash.com/developers.
(REST Countries v3 was retired upstream; verification now uses the local
`countries` table — no external call needed.)
