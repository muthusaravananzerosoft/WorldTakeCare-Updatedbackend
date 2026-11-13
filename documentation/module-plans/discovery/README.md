# discovery (planned)

Member search ("Meet a Foreigner In Your Hometown").

## Legacy filters (`search.php`)

| Param | Rule |
|---|---|
| `dobcon` | country — matches `fdob_con_id` **or** `fadd1_con_id` **or** `fadd2_con_id` |
| `state` | `fadd1_sta_id` or `fadd2_sta_id` |
| `sex` | 1 / 2 |
| `f`, `t` | age from/to (18–99), computed from `dob`; members with `dob=0` excluded |
| `race` | `frac_id` |
| `religion` | `reli_id` |
| `zipcode` (+ `range` 5/10/20/50/100 miles) | US only (country 231); exact zip match, or radius via `zip_code` lat/lon (`zipcode.class.php`) |

Always: `isdel=0 AND active=1 AND marital_status != 9`. Results show online badge, age, flag, avatar.
Country dropdowns list USA (231), India (102), Cambodia (45) and the visitor's GeoIP country first.

Other discovery lists:

| List | Rule | Legacy |
|---|---|---|
| Online members | members in `online_users`, excluding self | `get_online_members()` |
| Newest members (homepage) | 15 latest by `registered` | `view/front_new_members.php` |
| Today's birthdays (homepage) | `dob` month-day = today, 15 latest | `view/front_member_birthdays.php` |
| Members who visited a country | joined with `user_country_visited` (country level) | `view/member_by_con.php` |
| Birthday twins ("Birthdays" menu) | only on **your** birthday: all members born on the same day-month | `user-friends-bday.php` |

## Planned endpoints (`/api/v1/discovery`)

`GET /members?country=&state=&sex=&ageMin=&ageMax=&race=&religion=&zip=&radiusMiles=&page=` ,
`GET /online`, `GET /newest`, `GET /birthdays/today`, `GET /birthdays/twins`, `GET /visitors-of/:countryId`.

## Must NOT reproduce

Unescaped `$_GET` values concatenated into SQL (B-03); radius search filtering in PHP after loading all rows.
