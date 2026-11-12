# presence (planned)

## Legacy behaviour to preserve (`online_user_check()` in `php/php.inc.php`, table `online_users`)

- On every page load the visitor's row is upserted with the current time; `is_member` = member id or 0 (guest).
- Rows older than **300 s** are deleted → "online" = active in the last 5 minutes.
- Counters: total visitors and logged-in members (admin dashboard).
- Online badge on search results, friend lists; online-members sidebar.
- Logout and admin delete remove the member's rows.

## Planned endpoints (`/api/v1/presence`) + realtime

`GET /online?userIds=…`, `GET /stats` (admin); `presence:online` / `presence:offline` events driven by
WebSocket connections, with a heartbeat fallback for REST-only clients.

## Must NOT reproduce

B-14 visitor key = `ip2long(REMOTE_ADDR)` (members behind the same NAT collide; IPv6 breaks; values overflow
`int` to 2147483647) · cleanup query on every request · `online_users1` / `online_users_hold` unused tables.
