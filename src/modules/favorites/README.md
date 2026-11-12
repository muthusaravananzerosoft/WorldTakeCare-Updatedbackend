# favorites (planned)

## Legacy behaviour to preserve (`ajax/user-favorite.php`, `favorites.php`, table `favorites`)

- Private bookmark: `use_id` (owner) → `fuse_id` (favorited member). No notification.
- Duplicate add returns "already". Remove from the favorites page.
- List shows only active, non-deleted members (random order in legacy).

## Planned endpoints (`/api/v1/favorites`)

`GET /`, `POST /:userId`, `DELETE /:userId`.

## Must NOT reproduce

B-06 `user-favorite.php` has **no authentication** and trusts `use_id`/`fuse_id` from the request;
`favorites.php?action=delete` deletes by request parameters without ownership checks.
