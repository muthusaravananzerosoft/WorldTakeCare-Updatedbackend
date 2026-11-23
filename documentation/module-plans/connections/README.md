# Connections — member ↔ guide requests

Status: **implemented** (v1)

## Purpose

Connection requests between a trip's member and a guide. Either side can
initiate; only the recipient can accept or decline. An `accepted`
connection is the authorization gate for the future Chat module.

## Endpoints

| Method | Path                              | Auth         | Description                          |
| ------ | --------------------------------- | ------------ | ------------------------------------ |
| GET    | `/api/v1/connections`             | member/guide | My connections (status/type/tripId + pagination) |
| POST   | `/api/v1/connections`             | member/guide | Send a request — see directions      |
| GET    | `/api/v1/connections/:id`         | member/guide | Detail — parties only                |
| PATCH  | `/api/v1/connections/:id/accept`  | recipient    | Accept a pending request             |
| PATCH  | `/api/v1/connections/:id/decline` | recipient    | Decline a pending request            |

## Directions

- `{ guideId }` or `{ guideId, tripId }` — **member → guide**. Sender must
  have role `member`; `guideId` must be an active `guide` user.
- `{ memberId }` or `{ memberId, tripId }` — **guide → member**. Sender must
  have role `guide`; `memberId` must be an active `member` user.
- Exactly one of `guideId`/`memberId` per request.
- `tripId` is **optional** — omit it for a direct request; `trip_id` is
  stored as NULL. When provided it only needs to exist (FK validity);
  trip ownership is not required.

## Rules

- One row per `(trip_id, member_id, guide_id)` — NULL trips share one
  pair via a generated `trip_pair` column — a pending request in
  EITHER direction blocks a new one (`409`); an accepted pair returns
  `409` "already connected".
- A **declined** request CAN be re-sent (by either side): the same row
  is re-opened as `pending` with the new requester/recipient.
- Only `recipient_user_id` may accept/decline; non-pending → `409`.
- Self-requests are rejected (`400`). Unrelated users see `404`.
- Embedded user info is limited to `id`, `firstName`, `lastName`.
- Chat gate (future): allow chat only when a connection row exists,
  `status = 'accepted'`, and the user is `member_id` or `guide_id`.

## Table

`connections` — see `database/migrations/2026-11-20b_connections.sql`.
FKs: `trip_id → trips`, `member_id`/`guide_id`/`requester_user_id`/
`recipient_user_id → user` (cascade on delete).
