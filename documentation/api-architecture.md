# API architecture

## 1. Base URL and versioning

```
http://localhost:4000/api/v1        (development)
https://<api-host>/api/v1           (production — host to be decided)
```

- Version is part of the path. Breaking changes ship under `/api/v2`; `/api/v1` keeps working until clients migrate.
- Constants: `src/common/constants/api.constants.ts` (`API_VERSION`, `API_PREFIX`).
- Routers are registered only in `src/routes.ts`, at the `basePath` declared in `src/modules/module-registry.ts`.

## 2. Response envelope

Success:
```json
{
  "success": true,
  "data": { "...": "..." },
  "meta": {
    "requestId": "8b0c…",
    "timestamp": "2026-11-12T13:40:00.000Z",
    "pagination": { "page": 1, "pageSize": 20, "totalItems": 134, "totalPages": 7 }
  }
}
```

Error:
```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [ { "location": "body", "path": "email", "message": "Invalid email address" } ] },
  "meta": { "requestId": "8b0c…", "timestamp": "2026-11-12T13:40:00.000Z" }
}
```

`pagination` appears only on list endpoints. Clients branch on `error.code`, never on `message`.
Helpers: `sendSuccess()` / `sendError()` in `src/common/responses/api-response.ts`.

## 3. HTTP status conventions

| Status | Use |
|---|---|
| 200 | Successful read/update |
| 201 | Resource created (`Location` header when applicable) |
| 204 | Successful delete with no body |
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `BAD_REQUEST` |
| 401 | `UNAUTHORIZED` — missing/invalid/expired token |
| 403 | `FORBIDDEN` (authenticated but not allowed), `CORS_NOT_ALLOWED` |
| 404 | `NOT_FOUND` (resource), `ROUTE_NOT_FOUND` (path) |
| 409 | `CONFLICT` — duplicate email, already liked, already friends |
| 413 | `PAYLOAD_TOO_LARGE` |
| 422 | Semantically invalid state transitions (reserved) |
| 429 | `TOO_MANY_REQUESTS` (rate limiting, planned) |
| 500 | `INTERNAL_ERROR` (details hidden in production) |
| 501 | `NOT_IMPLEMENTED` (reserved) |

Codes: `src/common/constants/error-codes.constants.ts`.

## 4. Conventions

| Topic | Convention |
|---|---|
| Resource naming | plural nouns, kebab-case (`/video-calls`, `/reference-data`) |
| Current user | `/me` (e.g. `GET /users/me`, `PATCH /profiles/me`) — identity comes from the token, never from body/query |
| JSON fields | camelCase (legacy snake/abbreviated names like `fdob_con_id` are mapped to `birthCountryId`) |
| Ids | numeric legacy-compatible ids (pending D-3) |
| Dates | ISO-8601 UTC strings; dates of birth `YYYY-MM-DD` |
| Pagination | `?page=1&pageSize=20` (max 100); cursor pagination (`?before=`) for chat history |
| Filtering/sorting | query params, validated by Zod (`?sex=2&ageMin=25&ageMax=40&country=102`) |
| State changes | never via GET (fixes B-05) |
| Uploads | `multipart/form-data` on dedicated endpoints |
| Idempotency | likes/favourites/friend requests return 409 on duplicates (legacy "already") |
| Correlation | `X-Request-Id` request/response header; included in every error log |
| CORS | allow-list in `CORS_ORIGINS`; credentials enabled for refresh-token cookie |
| Docs | OpenAPI 3.1 in `src/docs/openapi.ts`; each implemented endpoint must be documented there |

## 5. Request validation

```ts
router.post(
  '/:userId',
  requireAuth,                                    // planned
  validate({ params: z.object({ userId: z.coerce.number().int().positive() }) }),
  likesController.create,
);
// controller: const { params } = res.locals.validated;
```

- `validate()` (`src/middleware/validate.middleware.ts`) parses `params`, `query`, `body`, collects all issues into one 400,
  and stores parsed values in `res.locals.validated` (Express 5's `req.query` is read-only).
- Use `.strict()` for bodies to reject unknown fields (mass-assignment guard, B-07).

## 6. Implemented endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Liveness + version + environment + `checks.database` (`not_configured` until D-2) |
| GET | `/api/docs` | Swagger UI (development / when `API_DOCS_ENABLED=true`) |
| GET | `/api/docs.json` | OpenAPI document |

## 7. Planned endpoint map (from legacy features)

Detailed per module in `src/modules/<module>/README.md`. Summary:

| Module | Base path | Main endpoints |
|---|---|---|
| auth | `/auth` | `POST /register`, `/activate`, `/resend-activation`, `/login`, `/refresh`, `/logout`, `/password/forgot`, `/password/reset`; `GET /email-availability`; `GET /social/:provider`, `/social/:provider/callback` |
| users | `/users` | `GET /me`, `PATCH /me/account`, `PUT /me/password`, `GET /username-availability`, `GET /:idOrUsername` |
| profiles | `/profiles` | `GET /:userId`, `GET /me`, `PATCH /me`, `PATCH /me/locations` |
| media | `/media` | `GET /users/:userId/photos`, `POST /me/photos`, `DELETE /me/photos/:photoId`, `PUT /me/avatar`, `PUT /me/profile-photo`, `PUT /me/videos`, `PUT|DELETE /me/background-music` |
| discovery | `/discovery` | `GET /members`, `/online`, `/newest`, `/birthdays/today`, `/birthdays/twins`, `/visitors-of/:countryId` |
| likes | `/likes` | `POST|DELETE /:userId`, `GET /sent`, `GET /received` |
| favorites | `/favorites` | `GET /`, `POST|DELETE /:userId` |
| friends | `/friends` | `GET /`, `DELETE /:userId`, `GET /requests/incoming|outgoing`, `POST /requests/:userId`, `POST /requests/:userId/accept|decline` |
| messages | `/messages` | `GET /conversations`, `GET /conversations/:userId`, `POST /`, `POST /conversations/:userId/read`, `DELETE /conversations/:userId`, `GET /unread-count` |
| chat | `/chat` | `GET|POST /conversations/:userId/messages`, `POST /conversations/:userId/seen`, `GET /smilies` (+ WebSocket events) |
| video-calls | `/video-calls` | `POST /`, `GET /`, `POST /:id/join|end|decline` (+ events) |
| presence | `/presence` | `GET /online?userIds=`, `GET /stats` |
| notifications | `/notifications` | `GET /counts` |
| travel | `/travel` | `GET /users/:userId/visited|planned`, `POST /me/visited`, `DELETE /me/visited/:countryId`, `PUT /me/planned` |
| posts | `/posts` | `GET /`, `GET /:id`, `POST /`, `DELETE /:id`, `GET|POST /:id/comments` |
| blog | `/blog` | `GET /posts`, `GET /posts/:id`, `GET|POST /posts/:id/comments` |
| content | `/content` | `GET /pages/:slug`, `GET /menus/:id` |
| contact | `/contact` | `POST /` |
| reference-data | `/reference-data` | `GET /countries`, `/countries/:id/states`, `/states/:id/cities`, `/zip-codes/:zip`, `/timezones`, `/ethnicities`, `/heights`, `/education-levels`, `/lifestyle-tags`, `/religions` |
| admin | `/admin` | members, pending members, content, blog, reference data, contact inbox, bulk email, stats |

## 8. Mobile and realtime readiness

- No cookies required for mobile: `Authorization: Bearer <access token>`; requests without `Origin` pass CORS.
- Realtime: WebSocket server on the same HTTP server (`src/realtime`), authenticated with the access token;
  REST remains the write path.
