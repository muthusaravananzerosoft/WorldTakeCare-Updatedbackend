# PHP → Express migration mapping

Purpose: make sure no existing feature, business rule or validation is lost — and that no legacy
bug is carried over. Machine-readable version of the file/table mapping:
[`src/common/constants/module-registry.ts`](../src/common/constants/module-registry.ts).

**Migration status legend:** ✅ implemented · 🧱 scaffolded (folder + README + registry entry, no endpoints) ·
🗑️ intentionally not migrated · ❓ needs a team decision.

## 1. Feature mapping

| Legacy feature | Legacy PHP files | Tables | New module | Status |
|---|---|---|---|---|
| Health check | — (new) | — | `health` | ✅ `GET /api/v1/health` |
| Registration + email activation | `homeregister_submit.php`, `account-activation.php`, `aside-right.inc.php`, `user-check/email-register-duplicate.php` | `user_tmp`, `user` | `auth` | 🧱 |
| Registration without activation | `check_reg.php`, `register-new-account.php` | `user` | `auth` | 🗑️ replaced by the single verified path (B-10) |
| Login / logout | `login-account.php`, `logout.php`, `header.inc.php` | `user`, `online_users` | `auth` | 🧱 |
| Session-from-URL login | `login-from-social-media.php` | — | — | 🗑️ security hole (B-01) |
| Social sign-in | `social-login.php`, `microsoft-login.php`, `apple-login.php`, `facebook-php-sdk/`, `social-login-config.php` | `user`, `user_social_login` | `auth` + `integrations/social-auth` | 🧱 ❓ D-5 (which providers) |
| Password reset | `forgot-password.php`, `forgot-mpassword.php`, `password-recover.php`, `mpassword-recover.php` | `user.pass_tmp/pass_date` | `auth` | 🧱 |
| Account settings | `user-save.php?q=account`, `include/user-account.php`, `user-check/*duplicate*.php`, `old_password-check.php` | `user` | `users` | 🧱 |
| Profile details & locations | `users.php`, `include/user-profile.php`, `include/user-location.php`, `include/user-home.php`, `user-save.php?q=profile|location`, `get_member_profile()` | `user` + lookups | `profiles` | 🧱 |
| Photos / avatar / videos / background music | `user-check/photo.php`, `include/user-photo.php`, `include/user-video.php`, `user-check/background.php`, `include/user-background.php` | `user_photo`, `user` | `media` + `integrations/storage` | 🧱 ❓ D-4 (storage) |
| Search | `search.php`, `search-check.php`, `include/zipcode.class.php` | `user`, `zip_code`, geo | `discovery` | 🧱 |
| Newest members, today's birthdays, birthday twins, visitors of a country | `view/front_new_members.php`, `view/front_member_birthdays.php`, `user-friends-bday.php`, `view/member_by_con.php` | `user`, `user_country_visited` | `discovery` | 🧱 |
| Likes | `ajax/user-like.php` | `user_like` | `likes` | 🧱 ❓ D-7 (matches) |
| Favourites | `ajax/user-favorite.php`, `favorites.php` | `favorites` | `favorites` | 🧱 |
| Friends | `add-friend.php`, `accept-friend.php`, `friends.php`, `friends-requests.php`, `view/get-*.php` | `friend_request`, `user.friends` | `friends` | 🧱 |
| Private messages | `message.php`, `common/message.php` | `email` | `messages` | 🧱 ❓ D-6 |
| Live chat | `chat.php`, `ajax/chat-script_page.php`, `js/chat-functions.js` | `chat`, `smilies` | `chat` + `realtime` | 🧱 ❓ D-6 |
| Online presence | `online_user_check()`, `get_online_users()` | `online_users` | `presence` + `realtime` | 🧱 |
| Video calls (VideoSDK) | `video_chat.php`, `video-call.php`, `notify.php`, `polling.php`, `cancel_meeting.php`, `update_status.php`, `check_meeting_status.php`, `notify_leave.php` | `video_chat` | `video-calls` + `integrations/video` + `realtime` | 🧱 ❓ D-11 |
| Flash webcam chat | `webcam/`, `ScriptCam-master/`, `ajax/updateStratus.php`, `*.swf` | `chat` (webcam rows), `peer_*` | — | 🗑️ Flash is dead |
| PHP WebRTC signalling prototype | `php/signaling.php`, `signaling.json` | — | — | 🗑️ unused |
| Visited / planned countries | `user-check/visited_country.php`, `user-check/visiting_country.php`, `include/user-visit*_country.php` | `user_country_visited`, `user_visiting_country` | `travel` | 🧱 |
| Status posts & comments | `user-posts1.php`, `user-posts-add.php`, `user-posts-details.php` | `user_posts`, `user_posts_comments` | `posts` | 🧱 |
| Header badge counts | `header.inc.php` | `email`, `video_chat`, `friend_request` | `notifications` | 🧱 |
| Transactional emails | `mailer.php`, `php/mail/mail.function.php` | — | `integrations/mail` (used by auth, likes, contact, admin) | 🧱 |
| Birthday email cron | `cron.php`, `user-bday-card.php` | `user` | `notifications` (scheduled job) | 🧱 ❓ D-12 |
| Blog | `blog.php`, `blog_details.php`, `wt/blog_post.php`, `wt/comments.php` | `blog`, `blog_comments` | `blog` | 🧱 ❓ D-13 |
| CMS pages / menus / URL aliases / world clock | `index.php`, `page.tpl.php`, `node.tpl.php`, `url_alias()`, `wt/node*.php`, `wt/page.php`, `wt/menu.php`, `wt/clock.php` | `node`, `node_type`, `page`, `menu`, `url_alias`, `worldclock` | `content` | 🧱 ❓ D-13 |
| Contact form | `about-us.php`, `contact-by-message.php`, `wt/contact.php` | `contact` | `contact` + `integrations/captcha` | 🧱 |
| Reference data | `get_states.php`, `get_cities.php`, `timezoneset.php`, `get_countries*()`, `get_race()`… | geo + lookup tables | `reference-data` + `integrations/geoip` | 🧱 (recommended first) |
| Admin panel | `wt/**` | all | `admin` | 🧱 |
| Mailchimp SDK | `mailchimp/`, `Mailchimp.php` | — | — | 🗑️ not used by app code (❓ D-14 if newsletter wanted) |
| Debug / test / backup files | `test*.php`, `phpinfo.php`, `*HOLD`, `*bk*`, logs, dumps | — | — | 🗑️ |

## 2. Business logic that must be preserved

| # | Rule | Legacy source |
|---|---|---|
| R-01 | Login by **username or email** | `login-account.php` |
| R-02 | Distinct outcomes: unknown / deleted / not activated / wrong password (expose deleted & not-activated as distinct codes; unknown and wrong password should share one code to avoid enumeration) | `login-account.php`, `header.inc.php` |
| R-03 | Email must be unique across active and pending accounts | `email-register-duplicate.php` |
| R-04 | Members must be **18+** (enforce on the server) | registration JS |
| R-05 | Account cannot be used until email is verified | `homeregister_submit.php`, `account-activation.php` |
| R-06 | Activation logs the member in | `account-activation.php` |
| R-07 | Old password stays valid until a reset completes | `forgot-mpassword.php` |
| R-08 | Social sign-in auto-creates the account; force first/last name completion before using the site | social handlers, `define.php` |
| R-09 | Only `active=1 AND isdel=0` members are visible anywhere (add `suspend=0` — B-31) | everywhere |
| R-10 | Relationship status "Offline" hides the profile from search | `search.php`, `user-profile.php` |
| R-11 | `other_religion` only kept when religion = Other | `user-save.php` |
| R-12 | Up to 14 gallery photos; avatar and profile image chosen from the gallery; deleting a photo clears avatar/profile references | `user-check/photo.php` |
| R-13 | Background music: MP3 only, ≤ 10 MB | `user-check/background.php` |
| R-14 | Search: country matches birth country or either address; age computed from DOB, unknown DOB excluded; US zip radius 5–100 miles | `search.php` |
| R-15 | One like per pair; liked member is emailed | `ajax/user-like.php` |
| R-16 | One favourite per pair | `ajax/user-favorite.php` |
| R-17 | Friend request accept makes both members friends; decline removes the request; re-sending refreshes it | `add-friend.php`, `accept-friend.php` |
| R-18 | Messages keep separate read/delete state for sender and receiver | `common/message.php` |
| R-19 | Online = activity within 5 minutes | `online_user_check()` |
| R-20 | Video call has a 60-second hard limit (confirm — D-11); callee sees pending calls | `video_chat.php` |
| R-21 | Visited countries: country or country+state, no duplicates; planned: max two countries | `user-check/visit*` |
| R-22 | Contact form requires captcha + honeypot + valid email | `contact-by-message.php` |
| R-23 | Admin: suspend/unsuspend, soft delete/restore, hard delete (cascades member data), manual activation, resend activation | `wt/common/more_action.php` |
| R-24 | Only `roles = 1` can access admin functions | `is_administrator()` |
| R-25 | Friendly URLs for static pages and member profiles (`/user/{id}`, `/user/{username}`) must keep working (frontend routes + API lookups) | `.htaccess`, `url_alias` |
| R-26 | Countries list shows USA, India, Cambodia and visitor's GeoIP country first | `get_countries_orderby()` |

## 3. Validations to migrate (server-side, in Zod)

| Field | Legacy rule | New rule |
|---|---|---|
| email | HTML `type=email`; `filter_var` only in contact | `z.email()`, lower-cased, ≤ 254 chars, unique |
| password | min 8 (client) | min 8, max 128, server-side; breached-password check optional |
| confirm email/password | client match | server match |
| first/last name | required; column limit 30 | required, trimmed, 1–30 (extend to 50 — decision), no HTML |
| sex | radio 1/2 (0 for some social users) | enum, allow `unspecified` for social sign-ups |
| date of birth | day/month/year selects, years 1920–2013 | valid date, age ≥ 18, ≤ 100 |
| country of birth | required, ≠ 0 | existing `countries.id` |
| honeypot | `check_val` empty | keep (or replace with captcha only) |
| reCAPTCHA | client only on registration | verify server-side |
| username | unique (AJAX) | optional, unique, `[A-Za-z0-9._ -]{3,50}` (`.htaccess` pattern) |
| photo upload | none | JPEG/PNG/WebP/GIF by magic bytes, ≤ 10 MB (decision), max 14 per member |
| background music | `.mp3`, ≤ 10 MB, char blacklist | MP3 by magic bytes, ≤ 10 MB |
| message | subject + body required | subject ≤ 200, body ≤ 10,000, recipient exists and is visible |
| chat line | non-empty | 1–250 chars (column size), sanitised |
| search age | 18–99, from ≤ to | same, server-side |
| zip radius | 5/10/20/50/100 | enum, zip must exist |
| contact form | required + email format | same + rate limit |

## 4. Database operations that need replacement

| Legacy pattern | Replacement |
|---|---|
| `db_insert($table, $_POST)` / `db_update($table, $_POST, $cond)` (writes any POSTed column) | Typed repository methods with explicit field lists; Zod `.strict()` DTOs |
| String-concatenated SQL with raw request values | Parameterised queries / ORM query builder only |
| `user.friends` CSV `concat(friends, ',id')` | `friendships` table rows inside a transaction |
| `SELECT … ORDER BY id DESC LIMIT 1` to get the inserted id | `RETURNING id` / driver insert id |
| `online_users` upsert + delete on every request | Connection-based presence (WebSocket) with in-memory/Redis store |
| `ORDER BY RAND()` for lists | Deterministic ordering + pagination |
| Radius search done in PHP after loading all members | SQL distance query (bounding box + haversine) or PostGIS |
| `INSERT … SELECT` from `user_tmp` + `DELETE` without transaction | Single `UPDATE users SET status='active'` in a transaction |
| `mysqli` connection opened per request | Pooled client created once (`src/database`) |

## 5. Functionality that needs redesign

| Area | Legacy | Redesign |
|---|---|---|
| Auth | PHP session cookie | Stateless access token + rotating refresh token (web: httpOnly cookie; mobile: secure storage) — D-1 |
| Passwords | MD5 | Argon2id; on first successful login with an MD5 hash, verify MD5 then rehash; accounts with MD5("") forced to reset |
| Tokens | MD5(rand) stored in clear, no expiry | 32-byte random, store SHA-256 hash, expiry (activation 48 h, reset 1 h), single use |
| Registration | two paths | one path with email verification |
| Messaging | `email` (async) + `chat` (live) | Keep both or unify into conversations — D-6 |
| Realtime | HTTP polling | WebSockets (`src/realtime`) |
| Presence | IP-based | authenticated connections + heartbeat |
| Video calls | VideoSDK page with ids in URL | Server creates meeting + per-user token; invite delivered by realtime event |
| Uploads | web-root disk | object storage + signed URLs, image processing |
| Notifications | emails + computed badges | `notifications` module, optional in-app feed and push (D-9) |
| Photos | 14 fixed columns | one row per photo |
| Admin | GET links, no CSRF, weak guards | role-guarded REST endpoints + audit log |
| CMS | PHP front controller + `url_alias` | API endpoints or move static pages to the Next.js app/headless CMS — D-13 |
| Birthday mail | cron calling a third-party URL | in-house scheduled job using `integrations/mail` |

## 6. Bugs and incomplete functionality that must NOT be reproduced

B-01 … B-32 in [existing-project-analysis.md §9](./existing-project-analysis.md#9-identified-technical-issues-bug-catalogue).
Each module README lists the ones relevant to it. Highlights: auth bypass by URL, MD5, SQL injection,
mass assignment to `roles`, unrestricted uploads, secrets in source, CSRF via GET, IDOR on likes/favourites,
broken video status endpoints, one-sided unfriend, suspended members able to log in.

## 7. Concepts that can be reused

- The product model (local ↔ traveller, visited/planned countries, birth country vs. current locations).
- Reference data sets (countries, states, cities, US zip codes, lookups) — migrate 1:1.
- Email texts (welcome, activation, reset, like) as a starting point for new templates.
- Search filter set and visibility rule.
- Admin capability list.
- Header badge semantics (what counts as "unread").

## 8. Data migration (ETL) outline

One-off, repeatable script (separate from app migrations), reading **a copy** of the dump into a
staging database — never the live server.

1. Load `worldtaker.sql` into an isolated staging MariaDB.
2. Copy reference tables 1:1 keeping ids.
3. `user` → `users` + `profiles` + `user_locations`; keep `use_id` (D-3); keep MD5 hash in `legacy_password_md5` for rehash-on-login; mark empty-hash accounts `password_reset_required`; resolve the 6 duplicate emails manually.
4. `user_tmp` → pending users only if still relevant (D-15).
5. Explode CSVs: `friends` → `friendships` (drop dangling ids; decide on one-sided pairs), `other` → lifestyle tags, `fdob_nationality_id` → nationalities, `video` → videos.
6. `user_photo` → `photos` (+ avatar/profile flags from `user.img/profile_img`); copy files from `users/{id}/` into object storage.
7. Likes, favourites, friend requests, visited/planned countries, posts, comments, messages, chat (parse 3 timestamp formats) → new tables, **dropping orphans** (counts in database-analysis §6).
8. `user_social_login` → `social_accounts` by `provider_id`; normalise provider names.
9. CMS/blog content → `content`/`blog` (drop junk aliases).
10. Skip: `online_users*`, `peer_*`, `chat_new`, `password_request`, `user_activation`, expired `video_chat`, `contact` spam (D-16).
11. Verification report: row counts per table, orphan counts dropped, sample profile diff.
