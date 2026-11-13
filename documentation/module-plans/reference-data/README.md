# reference-data (planned)

Read-only lookup lists used by forms and search. Ideal first module to implement (no auth, no writes).

| Lookup | Legacy table | Legacy endpoint/function | Notes |
|---|---|---|---|
| Countries | `countries` | `get_countries*()` | `code` (ISO-2), `call_code`, `display_order`; USA=231, India=102, Cambodia=45 pinned |
| States of a country | `country_states` (`fcon_id`) | `get_states.php?id=` | |
| Cities of a state | `country_state_cities` (`fsta_id`) | `get_cities.php?id=` | ~35k rows, US-heavy |
| US zip codes | `zip_code` | `zipcode.class.php` | lat/lon for radius search |
| Timezones | `timezones` | `get_timezone()` | fixed offsets (no DST); browser tz stored in session by `timezoneset.php` |
| Ethnicity | `race` | `get_race()` | ordered by `priority` |
| Height | `height` | `get_height()` | |
| Education | `education_level` | `get_education()` | |
| Lifestyle tags | `general` | profile `other` CSV | |
| Religion | *(hard-coded 1–7 in PHP)* | `search.php`, profile form | no table — create one |
| Smilies | `smilies` | chat | |

## Planned endpoints (`/api/v1/reference-data`)

`GET /countries`, `GET /countries/:id/states`, `GET /states/:id/cities`, `GET /zip-codes/:zip`,
`GET /timezones`, `GET /ethnicities`, `GET /heights`, `GET /education-levels`, `GET /lifestyle-tags`, `GET /religions`.
Cacheable (ETag / Cache-Control).
