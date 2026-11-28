# Member discovery (implemented)

Public member listing and search for the Meet People / Member Discovery page.
The homepage recent-members API remains separate at `GET /api/v1/users/newest`.

## Implemented endpoint

`GET /api/v1/discovery/members`

Optional query parameters:

| Parameter | Rule |
|---|---|
| `q` | Case-insensitive name search (first, last, or full name), up to 80 chars |
| `ageMin`, `ageMax` | Inclusive age range, 18–99 |
| `gender` | `male` or `female` |
| `countryCode`, `stateId`, `city` | Current location; each address filter matches either saved location |
| `language` | Exact comma-separated language match (case-insensitive) |
| `lookingToMeet` | `man`, `woman`, `man_or_woman`, or `other` |
| `maritalStatus` | Relationship-status options except `offline` |
| `raceId`, `religionId`, `trait` | Existing profile attributes; trait accepts `non_smoker`, `vegetarian`, or `tourist_guide` |
| `sort` | `recommended` (default), `newest`, `age_asc`, `age_desc` |
| `page`, `limit` | Page starts at 1; default `1` / `15`; limit range 1–50 |

All filters combine with AND semantics. Location fields combine within either the primary or secondary saved address. Discovery includes active, non-deleted, non-suspended members with nonblank names; it excludes guides, admins, and profiles hidden by `marital_status = 9`. Missing age or gender remains null rather than excluding otherwise displayable profiles.

The response contains public member-card fields only: names, age, gender, current location, languages, profile/cover images, looking-to-meet preference, marital status, and traits. It does not expose email, date of birth, or private account data.

`recommended` orders by available profile fields (images, DOB, gender, language, location), then registration time and user id. All sort modes use user id as a deterministic final tie-breaker. This is a stable non-personalized default; the legacy schema has no recommendation or saved-preferences table.

## Still planned

Other legacy discovery lists (online, birthdays, visited-country members) and ZIP-radius search are not part of this listing endpoint.

## Legacy behavior retained

The homepage recent-members list remains independently implemented as `GET /api/v1/users/newest`, ordered by registration time and using its existing response shape.

All filter values are parameterized; do not reproduce the legacy unescaped `$_GET` SQL concatenation or load-all-then-filter ZIP radius behavior.
