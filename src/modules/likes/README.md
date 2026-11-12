# likes (planned)

## Legacy behaviour to preserve (`ajax/user-like.php`, table `user_like`)

- One-directional like: `use_id` (liker) → `fuse_id` (liked), `created_at` timestamp.
- Duplicate like returns "already"; no unlike exists in legacy.
- Liked member receives an email: "{liker name} has liked your profile".
- Only active, non-deleted members can be liked.
- **No matching logic exists** — mutual likes are not detected or surfaced. Whether to add
  "matches" is a product decision (see documentation/backend-architecture.md).

## Planned endpoints (`/api/v1/likes`)

`POST /:userId`, `DELETE /:userId` (new), `GET /sent`, `GET /received`.

## Must NOT reproduce

B-06 liker id taken from the request (`use_id`) instead of the session — anyone can like on behalf of anyone ·
SQL error text and a `debug.log` returned/written in production.
