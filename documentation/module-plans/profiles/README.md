# profiles (planned)

Dating/travel profile shown on `/user/{id}`.

## Legacy fields (table `user`)

`fname, lname, sex (1 male, 2 female), marital_status, dob (unix seconds), looking_to_meet (Man / Woman /
Man or Woman / free text "Other"), write_something (rich text), about (rich text), languages (free text),
other (CSV of general.gen_id lifestyle tags: Non Smoker, Vegetarian, Tourist Guide, Have Children),
frac_id → race, reli_id (1 Buddhism … 6 No Religion, 7 Other + other_religion), fhei_id → height,
fedu_id → education_level, fdob_con_id → countries (country of birth), fdob_nationality_id (CSV of countries)`.

Locations: primary `add1, fadd1_zip_id, fadd1_con_id, fadd1_sta_id, fadd1_cit_id, fadd1_tmz_id`
and secondary `add2, fadd2_*` (country/state/city/zip/timezone).

Derived on display: age, Western sun sign, Chinese zodiac (`get_sun_sign`, `get_moon_sign`),
local time at each location (timezone offset), country flag.

## Legacy behaviour to preserve

- `marital_status` is really a *relationship/visibility status*: 1 Available, 2 Currently Seeing Someone,
  3 It's Complicated, 4 Single, 5 Married, 6 Separated, 7 Divorced, 8 Widowed, **9 Offline**.
  **9 hides the member from search** ("Your profile won't appear for the search") — the app's only privacy setting.
  Split into `relationship_status` + `search_visible` in the new model.
- `other_religion` is cleared unless `reli_id = 7`.
- Members without first+last name are redirected to complete the profile (Apple sign-in).
- Profile view joins race/height/education/timezones/countries/states/cities and resolves nationality names.

## Planned endpoints (`/api/v1/profiles`)

`GET /:userId`, `GET /me`, `PATCH /me` (details), `PATCH /me/locations`.

## Must NOT reproduce

Rich-text fields stored as raw HTML from a WYSIWYG editor → sanitise on write. `fadd*_cit_id` is
`varchar(500)` holding either a city id or free text — normalise during data migration.
