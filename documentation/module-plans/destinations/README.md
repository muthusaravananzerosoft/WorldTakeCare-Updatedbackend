# Destinations — search + famous attractions

Status: **implemented** (v1)

## Purpose

The travel search feature ("type a destination → see its famous tourist
spots"). A user types `madu`, picks **Madurai**, and the API returns the
well-known places around it — Meenakshi Amman Temple, Thirumalai Nayakkar
Palace, etc.

## Endpoints

| Method | Path                                   | Description                                   |
| ------ | -------------------------------------- | --------------------------------------------- |
| GET    | `/api/v1/destinations`                 | Module info                                   |
| GET    | `/api/v1/destinations/search`          | `q` (2–80 chars), `limit` ≤20, `kind` filter  |
| GET    | `/api/v1/destinations/:id`             | Destination detail (coords resolved lazily)   |
| GET    | `/api/v1/destinations/:id/attractions` | `limit` ≤50, `radiusKm` ≤50 (default 25)      |

## Data flow

1. **Search** — legacy `country_state_cities` → `country_states` →
   `countries` are searched first (they cover countries/states worldwide
   and ~35k US cities) AND merged with worldwide provider suggestions.
   Local rows keep `source='legacy'` but inherit the provider's
   `rank.importance` when they match an external hit — so a famous world
   city outranks obscure local namesakes (10 US towns named "Paris" can't
   bury Paris, France). Every returned result is materialised into the
   `destinations` table, so clients always receive our stable ids.
2. **Coordinates** — legacy rows have no lat/lng; the first detail or
   attractions call resolves them via the geo-search provider and stores
   them permanently.
3. **Attractions** — the `attractions` table is checked before any
   provider call. On a cache miss the provider runs **one proximity-biased
   query per tourist tier** (landmarks / museums+nature / attractions+
   worship) so a dense city's noise can't consume a shared quota. Results
   are cached (top 100); duplicates are prevented by
   `UNIQUE(source, source_id)`. Curated rows from `curated_attractions`
   are merged in, and provider rows are de-duplicated a second time —
   same-category POIs within 120 m, or name-similar POIs within 200 m
   (one OSM landmark is often several nearby features).

## Tourist relevance

Geoapify's Places API does **not** expose a dependable fame/popularity
score — so attraction ordering cannot lean on provider ratings. Instead
each POI gets an honest, computed `tourist_relevance` (0–100):

- **Category base** — tiered category prefixes (`tourism.sights` 85,
  `heritage` 92, museums 82, `natural.*` 72–85, `leisure.park` 60,
  `tourism.attraction.artwork` **20**, `religion.place_of_worship` **40** …).
  The broad religion category is required — famous landmarks like
  Meenakshi Amman Temple live there — but its low base score keeps
  ordinary neighborhood temples below real attractions unless also
  tagged `tourism.sights.*`.
- **Notability bonus** — +30 when the OSM feature links a Wikidata or
  Wikipedia entry. This is what separates Notre-Dame from a street
  mosaic; it is real provider metadata, not an invented score.
- **Distance penalty** — up to −10 scaled to the requested radius.
- **Curated** entries score 90 and set `is_featured` — this is an
  editorial signal, clearly separate from any provider-derived data.
- `rate` keeps whatever real provider signal exists (`rank.popularity`),
  and stays 0 when the provider reports nothing.

Results sort by `is_featured` → `tourist_relevance` → distance. Places
beyond ~12 km are flagged `dayTrip` so the frontend can mark them as
"nearby" rather than in-city.

## Names

Geoapify is queried with `lang=en`; `display_name` prefers
`name_international.en` (then `datasource.raw['name:en']`), while
`original_name` preserves the local-language name. No translations are
invented — if no English name exists the original name is served.

## Providers

`src/integrations/places/` — the geo-search contract
(`GeoSearchProvider`) and the attractions contract (`AttractionsProvider`)
are separate so either can be swapped independently. The current
implementation is Geoapify (`GEOAPIFY_API_KEY`); without a key a
no-op provider keeps the API functional.

> **Attribution (Geoapify free tier):** results shown to users must carry
> "Powered by Geoapify" and "© OpenStreetMap contributors" attribution —
> the frontend should render it near attraction lists/search results.
> Free tier ≈ 3,000 requests/day and ~5 req/s — the cache-first design
> keeps us far below that; rows in `attractions` are cached POI records
> (with `source`/`source_id`) so each place is fetched only once.

## Tables

- `destinations` — canonical destination rows (`kind`, `name`, `admin1`,
  `country_code`, `country_name`, `lat`, `lng`, `source`, `source_id`;
  unique per kind/source/id)
- `attractions` — cached POIs per destination (`name`, `original_name`,
  `category`, `lat`, `lng`, `rate`, `tourist_relevance`, `is_featured`,
  `distance_m`, `source`, `source_id`)
- `curated_attractions` — hand-verified famous spots (`name`, `category`,
  `lat`, `lng`, `city`, `admin1`, `country_code`). Matched to a
  destination by (city name, country) or by location (~25 km). Works for
  any city worldwide; seeded with Madurai and Ooty examples.

Migrations: `database/migrations/2026-11-19_destinations_attractions.sql`,
`database/migrations/2026-11-19b_attractions_relevance.sql`
