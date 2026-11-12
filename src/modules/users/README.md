# users (planned)

Account-level data and public member lookup.

## Legacy behaviour to preserve

- Account settings (`user-save.php?q=account`): change email, username, password. Password change
  requires the current password and matching new/confirm values.
- Username and email must be unique (`user-check/username-duplicate.php`, `email-register-duplicate.php`).
- Public profile URL by id **or** username: `/user/{id}` and `/user/{username}` (`.htaccess`).
- Only members with `isdel=0 AND active=1` are visible anywhere.
- Account states: `active` (activated), `suspend` (admin suspended), `isdel` (soft-deleted by admin),
  with `activated_date`, `suspended_date`, `deleted_date`, `last_logged`, `registered_ip`.
- Role: `roles` (1 = administrator, 3 = member default).

## Planned endpoints (`/api/v1/users`)

`GET /me`, `PATCH /me/account`, `PUT /me/password`, `GET /username-availability`,
`GET /:idOrUsername` (public card).

## Must NOT reproduce

B-07 `user-save.php` passes the whole POST body to `db_update` — a member could set `roles=1` and become admin;
wrong old password prints `no` but **still saves** · B-08 referer-based auth guard.
