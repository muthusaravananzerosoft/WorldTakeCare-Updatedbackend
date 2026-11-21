# Guides — self-service guide profile

Status: **implemented** (v1)

## Purpose

A guide's own public-facing profile (headline, areas, languages,
experience, specialties, rates, tour preferences, cover photo). Names
stay on the `user` row — `firstName`/`lastName` updates write `user.fname`/
`user.lname` in the same transaction.

## Endpoints

All require JWT + `guide` role. Identity comes from `req.user` only.

| Method | Path                                | Description                        |
| ------ | ----------------------------------- | ---------------------------------- |
| GET    | `/api/v1/guides/me/profile`         | Own profile — empty shell (200) when none exists yet |
| PATCH  | `/api/v1/guides/me/profile`         | Create-or-update, partial semantics |
| POST   | `/api/v1/guides/me/profile/cover`   | Upload cover (multipart `file`, JPG/PNG/WebP, ≤2 MB) |
| DELETE | `/api/v1/guides/me/profile/cover`   | Remove cover (`coverImage: null`) |
| POST   | `/api/v1/guides/me/profile/photo`   | Upload profile photo (same rules) — `profileImage` |
| DELETE | `/api/v1/guides/me/profile/photo`   | Remove profile photo (`profileImage: null`) |

## Patch semantics

- Field **absent** → unchanged; `null` → cleared to NULL; `[]` → array cleared.
- `verificationStatus`, `profileStatus`, `userId`, `guideId` → **400** (strict body).
- Names update the `user` row in the same DB transaction as the profile.

## Cover upload

- Magic-byte check (JPEG/PNG/WebP signatures) — declared MIME never trusted.
- Stored via `MediaStorage` (local disk under `uploads/`, served at
  `/uploads/*`, absolute URL via `APP_BASE_URL`); key `guide-covers/{userId}/{uuid}.{ext}`.
- Old file deleted only AFTER the new upload + DB write succeed.
- Binary never touches the DB — only the URL.

## Table

`guide_profiles` — `database/migrations/2026-11-20d_guide_profiles.sql`.
`user_id` UNIQUE → one profile per guide; `verification_status` /
`profile_status` backend-controlled enums.
