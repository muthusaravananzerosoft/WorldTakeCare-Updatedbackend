# media (planned)

Member photos, avatar, videos and background music.

## Legacy behaviour to preserve

- Gallery: up to **14** photos per member in `user_photo.img1…img14`; upload fills the first empty slot.
  Files stored at `users/{id}/{time}_{originalName}`.
- **Avatar** ("wall"): a gallery photo copied to `users/{id}/avata/` and referenced by `user.img`.
- **Profile image**: `user.profile_img` points at a gallery filename.
- Deleting a gallery photo also clears `img`/`profile_img` if they referenced it.
- Fallback image order: avatar → first gallery photo → country flag (or male/female silhouette).
- Videos: `user.video` = CSV of YouTube video ids.
- Background music: single MP3 (`user.bg_music`), max 10 MB, extension `.mp3` only.

## Planned endpoints (`/api/v1/media`)

`GET /users/:userId/photos`, `POST /me/photos` (multipart), `DELETE /me/photos/:photoId`,
`PUT /me/avatar`, `PUT /me/profile-photo`, `PUT /me/videos`, `PUT|DELETE /me/background-music`.

## Must NOT reproduce

B-29 gallery upload has **no type/size validation** and stores the original filename inside the web root
(remote code execution risk) → validate MIME by content, size limits, generated keys, storage outside the
app (`src/integrations/storage`), image re-encoding. Fixed 14-column design → one row per photo.
