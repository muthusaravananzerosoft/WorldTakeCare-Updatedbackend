# Existing WorldTaker PHP application — analysis report

> Reference project: `E:\MUTHU SARAVANAN\WorldTakeCare_Existing_PHPsource` (treated as **read-only**;
> nothing was modified, executed against a server, or connected to a database).
> Everything below is based on reading the actual source files and the SQL dump. Where something is
> inferred rather than seen directly, it is marked *(inferred)*.
>
> Companion documents: [feature-analysis.md](./feature-analysis.md) (feature-by-feature detail),
> [database-analysis.md](./database-analysis.md) (schema), [migration-mapping.md](./migration-mapping.md).

## 1. Application overview

| | |
|---|---|
| Product | **WorldTaker** — "Meet a Foreigner In Your Hometown / Meet A Local On Your Trip" (`php/define.php`, `header.inc.php`) |
| Positioning | Free social/dating site for friendship, companionship and dating between locals and travellers ("not necessary for love"; "fully committed to totally free membership" — About page, `node` 4). Operated by James C. Keo LLC (Terms page) |
| Live domain | `https://worldtaker.com` (hard-coded in many files) |
| Members | 250 accounts in the dump (2012 → Nov 2026), 3 administrators |
| Stack | PHP 8.4 (originally PHP 5 era code), Apache with `.htaccess` rewrites, MariaDB 10.11 via **mysqli**, jQuery 2/3 + Bootstrap 3 front end, server-rendered HTML |
| Framework | **None.** ~100 standalone PHP scripts in a flat web root plus shared include files |
| Monetisation | None found (no payment, subscription or plan code or tables) |

## 2. Folder structure

```
WorldTakeCare_Existing_PHPsource/
├── Database/
│   └── worldtaker.sql              ← authoritative schema + data dump (Nov 2026)
└── Existing_Code/
    ├── well-known.zip              ← archive of the same web root
    └── well-known/                 ← production web root (4,512 files, 1,183 .php)
```

### 2.1 Web root classification (`Existing_Code/well-known/`)

**Application code (in scope for migration)**

| Path | Files | Role |
|---|---:|---|
| `/*.php` (root) | 97 .php | Pages and form/AJAX handlers (front controller `index.php`, `users.php`, `search.php`, `message.php`, auth handlers …) |
| `php/` | 15 .php | Core includes: `define.php` (bootstrap), `connection.inc.php` (DB), `php.inc.php` (≈60 helper functions incl. `db_insert`/`db_update`), `php-pagination-class.php`, `mail/` |
| `include/` | 20 .php | Profile sub-pages (`user-profile`, `user-account`, `user-location`, `user-photo`, `user-video`, `user-background`, travel pages), `zipcode.class.php` |
| `user-check/` | 10 .php | Profile write handlers (photo, background music, travel, account, duplicate checks) |
| `ajax/` | 4 .php | `user-like.php`, `user-favorite.php`, `chat-script_page.php`, `updateStratus.php` |
| `common/` | 2 .php | `message.php` (send/delete private messages), `video_chat.php` |
| `view/` | 6 .php | Sidebar widgets (birthdays, new members, online friends, friend requests, members by country) |
| `wt/` | 74 .php | **Admin panel** (`/wt/`) — members, CMS, blog, lookups, geo data, bulk email |
| `webcam/` | 1 .php | Legacy Flash/ScriptCam webcam chat (`start-chat.php`) |
| `js/` | 43 (14 .php copies) | `function.js`, `chat-functions.js`, jQuery plugins; `js/include/*.php` are stale copies of `include/` |
| `css/`, `fonts/`, `img/`, `ico/`, `country_flags/`, `html/`, `mobile/`, `video/`, `magnific-popup/` | — | Static front-end assets |
| `users/` | 441 | **Member uploads** (`users/{id}/…`, `users/{id}/avata/…`) + default avatars |

**Third-party libraries (not migrated — replaced by npm packages or services)**

`PHPMailer/`, `mail/` (PHPMailer copies), `hybridauth/` (v2), `vendorHOLD/` (Composer: Hybridauth v3, phpseclib), `facebook-php-sdk/`,
`mailchimp/` + `Mailchimp.php`, `ckeditor/` (+CKFinder), `assetmanager/` + `scripts/` (InnovaStudio editor), `ScriptCam-master/`, `*.swf`.

**Backups, experiments and debris (not migrated)**

`* HOLD`, `*HOLD`, `*bk-*`, `*-old`, `*-rev*`, `*_hold.php` (e.g. `index.php HOLD`, `message.phpHOLD`, `hybridauthHOLD/`, `facebook-bk/`,
`account-activation-bk.php`, `register-new-account-hold.php`, `chat-old.php`, `search_new.php`, `index-rev.php`), test/diagnostic scripts
(`test.php`, `testmail.php`, `mailcheck.php`, `master_test.php`, `cron_test*.php`, `phpinfo.php`, `php.info.php`, `findandreplace.php`),
logs (`debug.log`, `error_log`, `hybridauth.log`, `applelogin.log`, `mslogin.log`), cron marker files (`ThisISTestFile-*`),
**three SQL dumps** (see database-analysis §1.1), `php.ini`, `.user.ini`.

> Inaccessible files: none — every file opened during the analysis was readable.

### 2.2 Configuration files

| File | Content |
|---|---|
| `php/connection.inc.php` | mysqli connection to `worldtaker` (host/user/password **hard-coded** — not reproduced here), `set_charset('utf8')`, HTML error page on failure |
| `php/define.php` | Session start (`session_save_path('/tmp')`), constants `__MEMBER_ID__`, `__TIMEZONE__`, `TABLE_*` names, `SITEURL`, includes all helpers, runs URL routing + presence tracking, forces name completion |
| `social-login-config.php` | OAuth client ids/secrets for Google, Twitter, Microsoft, Apple (incl. private key) — **secrets in source** |
| `mailer.php`, `php/mail/mail.function.php` | SMTP host/user/password — **secrets in source** |
| `facebook-php-sdk/config.php` | Facebook app credentials. `check_reg.php` also includes `facebook_login_with_php/config.php`, which **does not exist** in the web root — under PHP 8 the following `$facebook->getLoginUrl()` call on `null` is a fatal error, so `check_reg.php` most likely fails today *(inferred; not executed)* |
| `.htaccess` | HTTPS redirect, pretty URLs, front-controller catch-all |
| `php.ini`, `.user.ini` | Host PHP overrides |

## 3. Frontend architecture

- **Server-rendered PHP templates.** Every page includes `php/define.php`, then `header.inc.php`,
  page body, `aside-right*.inc.php` sidebar, `footer.inc.php`, and the floating chat widget `chat.php`.
- **jQuery AJAX** for small interactions; responses are **plain text tokens** (`ok`, `no`, `success`, `already`,
  `notFound`, `wrongPassword`, user id) or **HTML fragments** (chat, states/cities `<option>` lists),
  occasionally JSON (video endpoints, duplicate-email check). Many handlers respond with
  `<script>history.go(-1)</script>` or `window.location.href=…` instead of a status code.
- Validation on the client with `jqBootstrapValidation` (required fields, min length 8, email match),
  18+ check and reCAPTCHA check in JavaScript.
- Rich text via InnovaStudio LiveEditor / CKEditor (profile "about" fields, admin CMS).
- Timezone detection with `jstz` → `timezoneset.php` stores it in the session, then the page reloads.
- Polling: incoming video call every 8 s (`polling.php`), chat window polling (`js/chat-functions.js`).

**Conclusion:** there is no reusable API. Every PHP file mixes HTML, SQL and logic, so the new
Next.js frontend cannot reuse any of it; only behaviour and rules carry over.

## 4. Backend architecture and request handling

### 4.1 Routing

```
Browser ──HTTPS──► Apache (.htaccess)
   /                    → index.php?q=home           (home.tpl.php)
   /user/{id}           → users.php?q=home&id={id}    (public profile)
   /user/{username}     → users.php?q=home&username=
   /user/{id}?q=profile|account|location|photo|video|background|visited_country|visiting_country  (own profile editor)
   /wt/                 → wt/index.php                (admin)
   /blog                → blog.php
   /{slug}              → index.php?q={slug} → url_alias() → node.tpl.php | page.tpl.php | error.tpl.php
   /*.php               → the script itself (most features)
```

### 4.2 Lifecycle of every request (`php/define.php`)

1. `session_start()` (files in shared `/tmp`).
2. `__MEMBER_ID__` := `$_SESSION['member_id']` (empty string for guests).
3. `date_default_timezone_set($_SESSION['timezone'])`.
4. Include `connection.inc.php` (opens a new mysqli connection — no pooling), pagination class, mailer, `php.inc.php`.
5. `url_alias()` — resolves `$_GET['q']` against `url_alias` (SQL built from the raw parameter).
6. `online_user_check()` — **writes** `online_users` (INSERT/UPDATE + DELETE of stale rows) on every request.
7. If logged in and first+last name are empty → redirect to profile completion (Apple sign-in case).
8. The script runs its own SQL and echoes HTML/text.

### 4.3 Validation, data access, responses, errors

| Concern | How the legacy code does it |
|---|---|
| Input validation | Mostly client-side. Server-side: a few `empty()` checks, `intval()` in newer code, `mysqli_real_escape_string` in some handlers, honeypot `check_val`, `filter_var` only in contact form |
| Data access | Inline SQL strings via `$db->query()`; generic `db_insert($table, $_POST)` / `db_update($table, $_POST, $cond)` that **write every POST key matching a column name**; prepared statements only in video-chat files |
| Business logic | Inline in page scripts and in `php.inc.php` helpers (no service layer) |
| Responses | HTML pages; text tokens; JS redirects; some JSON |
| Errors | `display_errors=1` in many handlers; SQL errors echoed to the client (`echo $db->error`, `die("SQL Error: …")`); Hybridauth prints stack traces; generic `error-registration` redirect |
| Transactions | None (MyISAM tables cannot) |
| Logging | `error_log()` and ad-hoc `file_put_contents('debug.log', …)` inside the web root |

### 4.4 Traced request flows

**Login** (header form, `header.inc.php`)
```
jQuery POST a=<email|username>&b=<password> → https://worldtaker.com/login-account.php
  → SELECT * FROM user WHERE BINARY username='{a}' OR BINARY email='{a}'      (raw, injectable)
  → not found → "notFound" | isdel=1 → "deleted" | active=0 → "inactive"
  → md5(b) !== password → "wrongPassword"
  → $_SESSION['member_id']=use_id; echo use_id   (no session id regeneration)
  → JS maps tokens to messages, otherwise reloads "/"
```

**Registration with email activation** (homepage sidebar `aside-right.inc.php` → `homeregister_submit.php`)
```
Form POST (fname, lname, email, cemail, password≥8, sex, month/day/year, fdob_con_id, g-recaptcha, check_val honeypot, regsubmit)
  → JS: 18+ check, reCAPTCHA present (reCAPTCHA is NOT verified server-side here)
  → SELECT user/user_tmp by email+provider_id → if exists: alert "already registered"
  → registered=time(), registered_ip, password=md5(), qr=md5(random 99..99999), expiry=+60h, dob=strtotime(y-m-d)
  → require fdob_con_id≠0, email, dob, empty honeypot
  → db_insert(user_tmp, $_POST)
  → sendEmail(activation link account-activation.php?id={tmp_id}&qr={qr})
  → redirect thanks-registered.php
Click link → account-activation.php
  → SELECT user_tmp WHERE use_id={id} AND qr='{qr}'   (raw $_GET; expiry never checked)
  → INSERT INTO user (…) SELECT … FROM user_tmp; set activated_date; DELETE user_tmp row
  → welcome email → $_SESSION['member_id'] = new id → redirect "/"
```

**Registration without activation** (`check_reg.php`, pre-filled from `user_social_login` via `?id=&provider=`) → `register-new-account.php`:
same checks, but `db_insert(user, $_POST)` directly (account active immediately) and a welcome email.
`check_reg.php` is not linked from any PHP page and depends on a missing Facebook include (see §2.2), so this path is probably dead *(inferred)*.

**Social sign-in** (`social-login.php?provider=Google|Twitter`, `microsoft-login.php`, `apple-login.php`, Facebook SDK)
```
Hybridauth OAuth round-trip → profile {identifier, email, names, gender, birth date}
  → if no user_social_login row AND no user.provider_id: INSERT user (active=1) + INSERT user_social_login
  → SELECT user WHERE provider_id = identifier AND isdel=0 AND active=1
      found → session member_id (v3 flows regenerate the session id; v2 flow redirects to login-from-social-media.php?use_id=…)
      only in user_tmp → "/?status=activate"; otherwise → "/?status=deleted"
```

**Profile save** (`user-save.php?q=profile|account|location`)
```
AJAX POST of the whole form → (guard: rejects only if not logged in AND referer matches)
  q=profile:  about/write_something from editor, dob from y/m/d, other[] → CSV, other_religion cleared unless reli_id=7, "Other" looking_to_meet text
  q=account:  check old password (md5) → if new==confirm set password … but on mismatch prints "no" and continues
  → db_update(user, $_POST, use_id=__MEMBER_ID__) → every POSTed column name is updated (incl. roles, active, isdel …)
  → "ok" | "no"
```

**Like** (`ajax/user-like.php?use_id=&fuse_id=`) → count existing → INSERT `user_like` → email the liked member → `success` | `already`.
**Favorite** (`ajax/user-favorite.php`) → same without email, **no login check**.
**Friend request** (`add-friend.php?id=`, GET) → upsert `friend_request` → `history.go(-1)`.
**Accept/decline** (`accept-friend.php?f=&action=a`, GET) → append ids to both `user.friends` CSVs → delete request.
**Private message** (`common/message.php?action=send`, POST subject/message/to) → `db_insert(email, …)` → redirect `message.php?msg=ok`.
**Live chat** (`ajax/chat-script_page.php?set&content=…&chat_mid=…`, GET) → smilies → INSERT `chat` → echo HTML; `?get` returns the whole history as HTML.
**Video call** → see feature-analysis F-14.
**Photo upload** (`user-check/photo.php?action=add`, multipart `img`) → `move_uploaded_file` to `users/{id}/{time}_{name}` (no checks) → first NULL `imgN` slot updated.
**Search** (`search.php?…`) → builds one SQL string from `$_GET` filters → paginates → optional zip-radius filter in PHP.

## 5. Authentication and authorization

| Aspect | Legacy implementation |
|---|---|
| Identity | PHP session cookie (`PHPSESSID`), `$_SESSION['member_id']`; `__MEMBER_ID__` constant |
| Session storage | Files in shared `/tmp` (`session_save_path('/tmp')`) |
| Password hashing | `md5($password)` — unsalted; 16 accounts have the MD5 of an empty string |
| "Keep me logged in" checkbox | Present in the login form but **not implemented** |
| Session fixation protection | Only in Microsoft/Apple handlers (`session_regenerate_id`) |
| Login throttling / lockout | None |
| Email verification | Only on the homepage registration path |
| Password reset | Code emailed, valid until used (no expiry) |
| Roles | `user.roles`: 1 = admin, 3 = member; `is_administrator()` checks `roles=1` |
| Admin guard | `wt/header.inc.php` and `wt/common/more_action.php` call `is_administrator()`; `wt/common/save.php` only checks login (*any logged-in member could post to it*) |
| Member page guard | `if(!__MEMBER_ID__) redirect` in some pages; AJAX handlers inconsistent (several have none) |
| Account states | `active`, `isdel` (soft delete), `suspend` — note **`suspend` is not checked at login** |
| CSRF | No tokens anywhere; many state changes are GET links |

## 6. Third-party integrations

| Integration | Purpose | Where |
|---|---|---|
| SMTP via PHPMailer (`mail.worldtaker.com`, SSL 465) | All transactional email | `mailer.php#sendEmail` (current), `php/mail/mail.function.php#send_phpmailer` (admin resend) |
| Hybridauth v2 | Google, Twitter sign-in | `social-login.php`, `hybridauth/` |
| Hybridauth v3 | Microsoft Graph, Sign in with Apple | `microsoft-login.php`, `apple-login.php`, `vendorHOLD/` |
| Facebook PHP SDK | Facebook sign-in | `facebook-php-sdk/`, linked from `check_reg.php` |
| VideoSDK.live prebuilt RTC (CDN `rtc-js-prebuilt 0.3.43`) | One-to-one video calls | `video_chat.php` (API key in page source) |
| Google reCAPTCHA v2 | Registration (client-side only), contact form (verified server-side) | `aside-right.inc.php`, `check_reg.php`, `contact-by-message.php` |
| ipinfo.io | GeoIP → pre-select visitor's country | `php.inc.php#get_countries_orderby` (token in code; synchronous cURL on each form render) |
| YouTube | Profile videos by id, thumbnails | `user.video`, `getYouTube_screenshot()` |
| clocklink.com iframe | World clock widget | `worldclock` table |
| External birthday mailer (`zerosofttech.com/WorldTaker/curl_bday_mail.php`) | Daily birthday email | `cron.php` |
| ScriptCam (Flash) + Adobe Stratus | Legacy webcam chat (obsolete; Flash is dead) | `webcam/`, `ScriptCam-master/` |
| Mailchimp PHP SDK | Present but **not called** by application code | `mailchimp/`, `Mailchimp.php` |
| CKEditor/CKFinder, InnovaStudio | WYSIWYG editing and file browser | `ckeditor/`, `assetmanager/`, `scripts/` |

## 7. File uploads

| Upload | Handler | Validation | Storage |
|---|---|---|---|
| Gallery photo (max 14) | `user-check/photo.php?action=add` | **None** (no type, size, or content check; original filename kept) | `users/{id}/{time}_{name}` |
| Avatar ("wall") | `photo.php?action=wall` | Copies an existing gallery file | `users/{id}/avata/` |
| Background music | `user-check/background.php` | `.mp3` extension, ≤ 10 MB, filename character blacklist | `users/{id}/{name}` (overwrites previous) |
| Post image | `user-posts-add.php` | Client `accept=` only | `users/{id}/{time}_{name}` |
| CMS/blog image | `wt/common/save.php` | None | `img/node/{time}{name}` |
| CKFinder | `ckeditor/ckfinder` | Library defaults | `ckeditor/ckfinder/userfiles/` |

Six **0-byte `.php` files** with upload-style names exist inside member upload folders
(e.g. `users/117/1421021284_images74HYS8R1_old.php`) — consistent with scripts that were uploaded
through the unrestricted photo upload and later emptied *(inferred)*.

## 8. Email and notification functionality

All "notifications" are emails or computed header badges — see `src/modules/notifications/README.md`.
Templates are inline HTML heredocs in each handler (welcome, activation, password reset, like,
contact, resend activation, birthday). There is no notification table, queue, retry, unsubscribe,
or push notification.

## 9. Identified technical issues (bug catalogue)

IDs are referenced from module READMEs and the migration mapping. **None of these may be reproduced.**

| ID | Severity | Issue | Evidence |
|---|---|---|---|
| B-01 | Critical | **Authentication bypass**: `login-from-social-media.php` sets `$_SESSION['member_id'] = $_REQUEST['use_id']` — anyone can log in as any member (including admins) by URL. Also no session regeneration on password login (fixation) | `login-from-social-media.php`, `login-account.php` |
| B-02 | Critical | Unsalted MD5 password hashes; 16 empty-password hashes | `login-account.php`, `user` data |
| B-03 | Critical | **SQL injection** throughout (raw `$_GET`/`$_POST`/`$_REQUEST` in SQL), e.g. login identifier, activation `id`/`qr`, `add-friend.php?id`, favorites, chat, search filters, `get_friends()` | most handlers |
| B-04 | Critical | **Live secrets committed** in source (DB password, SMTP passwords, Google/Twitter/Microsoft OAuth secrets, Apple private key, VideoSDK key, ipinfo token, reCAPTCHA secret) — must all be rotated | `connection.inc.php`, `mailer.php`, `social-login-config.php`, `video_chat.php`, `php.inc.php`, `contact-by-message.php` |
| B-05 | High | No CSRF protection; state changes via GET links (friend add/accept, unfriend, favorites delete, **admin delete/suspend/purge**) | `add-friend.php`, `accept-friend.php`, `wt/common/more_action.php` |
| B-06 | High | IDOR: like/favorite trust `use_id` from the request; `user-favorite.php` has no login check | `ajax/user-like.php`, `ajax/user-favorite.php`, `favorites.php` |
| B-07 | Critical | **Mass assignment / privilege escalation**: `db_update(user, $_POST)` writes any posted column — a member can post `roles=1` to become admin; wrong old password still saves | `user-save.php`, `php.inc.php#db_update` |
| B-08 | Medium | Write guard depends on HTTP Referer | `user-save.php`, `user-check/*.php` |
| B-09 | High | 18+ rule and registration reCAPTCHA enforced only in JavaScript | `aside-right.inc.php`, `check_reg.php` |
| B-10 | Medium | Two divergent registration paths; one skips email verification | `homeregister_submit.php` vs `register-new-account.php` |
| B-11 | High | Activation and reset tokens = MD5 of a random int in 99–99,999 (guessable); expiry stored but never checked | `homeregister_submit.php`, `forgot-mpassword.php`, `account-activation.php` |
| B-12 | High | Incoming-call notification stored in the **caller's** session and gated by a condition that is never true → callee is never alerted | `video_chat.php`, `notify.php`, `polling.php` |
| B-13 | High | Video status endpoints use a non-existent column `video_id` → always fail | `update_status.php`, `check_meeting_status.php`, `notify_leave.php` |
| B-14 | Medium | Presence keyed by `ip2long(IP)`; collisions behind NAT, IPv6 breaks, int overflow; DB writes on every request | `php.inc.php#online_user_check` |
| B-15 | Medium | Friendships as CSV in `user.friends`; accept handler checks the wrong array (duplicates) | `accept-friend.php` |
| B-16 | Medium | Unfriend is one-sided; the unfriend handler is copy-pasted into unrelated pages (`forgot-password.php`, `password-recover.php`, `search.php`) | those files |
| B-17 | High | Stored XSS: names and profile HTML echoed without escaping in many templates | `php.inc.php#get_friends`, `users.php`, templates |
| B-18 | High | Reflected XSS in chat (`echo urldecode($_GET['content'])`) | `ajax/chat-script_page.php` |
| B-19 | Low | Dates stored as strings in mixed formats (chat `"18:21 PM"`, posts without year) | `chat`, `user_posts` |
| B-20 | High | Sensitive data in web-root logs: password-reset POST bodies (incl. new password) to `debug.log`; login logs with emails; `display_errors=1` | `mpassword-recover.php`, `ajax/user-like.php`, `apple-login.php`, `microsoft-login.php` |
| B-21 | Low | `wt/login.php` queries columns that do not exist (`user`, `pass`, `name`) — dead admin login | `wt/login.php` |
| B-22 | Low | `secure_data()` / `secure` class are dead and use the removed `mysql_escape_string` | `php.inc.php`, `php/secure_data.class.php` |
| B-23 | Medium | Internal errors leaked to clients (SQL error text, Hybridauth stack traces) | many |
| B-24 | High | Birthday cron POSTs members' emails and names to an external third-party domain; creates a file in the web root on every run | `cron.php` |
| B-25 | Low | `get_countries_orderby()` prints "JSON extension is enabled!" into pages and calls ipinfo synchronously | `php.inc.php` |
| B-26 | Medium | Message delete query has broken `AND … OR …` precedence | `common/message.php`, `message.php` |
| B-27 | Low | Contact form no longer stores submissions in `contact` | `contact-by-message.php` |
| B-28 | Medium | Admin hard delete leaves orphans (`chat`, `email`, posts, travel, likes are only removed by FK) — 1,000+ orphan rows today | `wt/common/more_action.php`, database-analysis §6 |
| B-29 | Critical | **Unrestricted file upload into the web root** (gallery, post, CMS images) → remote code execution risk; 0-byte `.php` files found in upload folders | `user-check/photo.php`, `user-posts-add.php`, `wt/common/save.php` |
| B-30 | High | Public exposure of SQL dumps with member data, `phpinfo.php`, logs and backup copies of source in the web root | see §2.1 |
| B-31 | Medium | `suspend` flag is set by admins but never checked at login or in listings | `login-account.php`, `search.php` |
| B-32 | Medium | `wt/common/save.php` (CMS, lookups, **edit any user incl. password**) only checks that someone is logged in, not that they are an admin | `wt/common/save.php` |

## 10. Incomplete, unused and duplicate functionality

- **Incomplete:** "Keep me logged in"; video-call status tracking (B-13); incoming-call alert (B-12);
  `user.online`/`last_logged` never written; `user_activation`/`password_request` abandoned; Mailchimp unused;
  PHP WebRTC signalling prototype (`php/signaling.php` writes one shared JSON file).
- **Duplicate:** two registration paths; two mailers; two presence tables + two unused copies; `chat` vs `chat_new`;
  Hybridauth v2 and v3; `facebook-php-sdk` vs `facebook-bk`; `include/` vs `js/include/`; many `HOLD`/`bk` copies.
- **Obsolete:** Flash webcam (ScriptCam/Stratus), Flash MP3 player for background music (`dewplayer-vol.swf`), Twitter OAuth 1.0a keys.

## 11. Dependencies between features

```
auth ─┬─► users/profiles ─► media
      ├─► presence ◄──────── (every request)
      └─► everything else requires a logged-in member

reference-data ─► profiles, discovery, travel, registration (country of birth)
profiles ─► discovery (filters: sex, age, location, race, religion, visibility=marital_status≠9)
friends ─► chat (online-friends list), birthdays (cron/notifications)
presence ─► discovery (online badge), chat (online members list), admin dashboard
messages + video-calls + friends ─► notifications (header badges)
likes ─► mail (notification email)
content (url_alias) ─► front controller for static pages
admin ─► all tables
```

## 12. Recommended migration approach

1. **Do not port code; port behaviour.** Re-implement each feature from the rules in
   [feature-analysis.md](./feature-analysis.md) behind a clean REST API (this repository).
2. **Security first.** Rotate every secret found (B-04) and remove public dumps/logs (B-30) on the live
   server now, independent of the migration (owner action).
3. **New, normalised schema** (database-analysis §7) + a one-off, repeatable **ETL** from the dump:
   keep ids, explode CSVs, drop orphans, convert to UTF-8, keep MD5 hashes only for rehash-on-login.
4. **Build order:** reference data → auth/users → profiles/media → discovery → likes/favorites/friends →
   messages → chat/presence/video (realtime) → travel/posts/blog/content/contact → admin.
5. **Parallel run:** keep the PHP site live until the new stack reaches feature parity, then cut over
   with a final ETL and redirects for legacy URLs (`/user/{id}`, `/{slug}`).
