# Trips — create & manage trips

Status: **implemented** (v1)

## Purpose

"My Trips" — a logged-in user saves a trip from the Create Trip form:
destination, dates, trip type, interests, dietary preferences, notes,
accommodation, emergency contact, insurance, budget and visibility.

## Endpoints

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| POST   | `/api/v1/trips`     | Create a trip (owner = Bearer token) |
| GET    | `/api/v1/trips`     | List the caller's trips              |
| GET    | `/api/v1/trips/:id` | Trip detail (owner or public trip)   |
| PATCH  | `/api/v1/trips/:id` | Partial update — owner only          |
| DELETE | `/api/v1/trips/:id` | Delete — owner only                  |

All routes require `Authorization: Bearer <accessToken>`.

## Access rules

- `POST/PATCH/DELETE` — owner only; other users get **404** (existence is
  not leaked).
- `GET /:id` — owner always; non-owners only when `visibility='public'`.
- **Sensitive fields** (`emergencyContact`, `insurance`) are only returned
  to the owner — never on a public trip viewed by someone else.
- User id always comes from the verified token (`req.user`), never from
  the request body.

## Tables

- `trips` — owner (`user_id` → `user.use_id`), `destination_id` →
  `destinations.dst_id` (SET NULL keeps the trip if the destination is
  deleted), dates, type, notes, accommodation, emergency contact, insurance,
  budget, `visibility`, `status` (`planned|ongoing|completed|cancelled`).
- `trip_interests` — multi-value interests (`PK(trip_id, interest)`).
- `trip_dietary_preferences` — multi-value dietary preferences.

Create + update run inside a DB transaction (row + child lists commit or
roll back together). Arrays are replace-on-write for PATCH.

## Day-wise itinerary

`trips.plan_mode` (`auto`|`manual`, default `auto`) records how the plan
was built so the roadmap restores the right mode on reopen; `manual` is
the meaningful mode for `itinerary`.

`trips.itinerary` (JSON) stores the plan as
`[{day, stops: [{attractionId, order, time?, note?}]}]`.

- Optional on POST/PATCH; on PATCH the whole array replaces the old one
  (send `[]` to clear). Omit the field to leave it unchanged.
- `day` must be `1..(endDate - startDate + 1)`; empty `stops` allowed.
- Every `attractionId` must exist in `attractions` or
  `curated_attractions` — the same ids the attractions endpoint returns.
- Membership: cached rows must have `destination_id = trip.destination_id`;
  curated rows pass when the city+country matches the destination or they
  sit within ~150 km (same rule the attractions endpoint uses to attach
  curated spots).
- `GET /trips/:id` enriches each stop with `{id, name, originalName,
  category, distanceM, rate, source}`; unresolved ids keep
  `attraction: null`. The trip *list* returns raw stops without enrichment.
- `time` is validated `HH:mm`; `order` is a positive int; `note` ≤ 500 chars.

Migration: `database/migrations/2026-11-19c_trips.sql` +
`2026-11-19e_trips_itinerary.sql` + `2026-11-19f_trips_plan_mode.sql`

## Future-proofing

- `visibility='friends'` is accepted today and behaves like `private` for
  non-owners until the friends module lands.
- `status` field is ready for lifecycle features.
- Child tables are generic tag lists — reusable for itinerary items later.
