# travel (planned)

The travel side of WorldTaker ("Meet a Local On Your Trip").

## Legacy behaviour to preserve

- **Countries visited** (`user-check/visited_country.php`, table `user_country_visited`):
  many rows per member; each row = country (`fcon_id`) and optional state (`fsta_id`, 0 = whole country).
  Adding a duplicate country/state is ignored. Delete by country (all states) or by country+state.
- **Countries planning to visit** (`user-check/visiting_country.php`, table `user_visiting_country`):
  exactly one row per member with up to two countries (`fcon1_id`, `fcon2_id`; 0 = none). Add once, then update.

## Planned endpoints (`/api/v1/travel`)

`GET /users/:userId/visited`, `POST /me/visited`, `DELETE /me/visited/:countryId[/states/:stateId]`,
`GET /users/:userId/planned`, `PUT /me/planned`.

## Notes

Fixed two-column "visiting" design → one row per planned country (allow N, or keep max 2 by rule — decision).
