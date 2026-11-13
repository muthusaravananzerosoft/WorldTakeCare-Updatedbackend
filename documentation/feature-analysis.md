# Feature analysis — WorldTaker PHP application

Every feature listed here was confirmed by reading its PHP source (paths relative to
`Existing_Code/well-known/`). Bug ids (B-xx) refer to
[existing-project-analysis.md §9](./existing-project-analysis.md#9-identified-technical-issues-bug-catalogue).
Feature-level detail (planned endpoints, rules) lives in `documentation/module-plans/<feature>/README.md`.

## 1. Inspection checklist results

| Checklist item | Exists? | Evidence / note |
|---|---|---|
| User registration | ✅ | F-01 |
| Login / logout | ✅ | F-02 |
| Authentication | ✅ session-based | F-02, existing-project-analysis §5 |
| Profile management | ✅ | F-05 |
| Profile information / personal details | ✅ | F-05 |
| Profile photos / media uploads | ✅ | F-06 |
| User preferences | ⚠️ partial | Only `looking_to_meet` (Man / Woman / both / other). No partner-preference table or saved searches |
| Discovery / search | ✅ | F-07 |
| Matching | ❌ | No match table, no mutual-like detection, no compatibility logic |
| Like / dislike | ⚠️ like only | F-08. No dislike/pass, no unlike |
| Favourites / interested | ✅ | F-09 |
| Messaging / chat | ✅ two systems | F-11 (async messages), F-12 (live chat) |
| Online / offline status | ✅ | F-13 |
| Notifications | ⚠️ email + header badges only | F-17 |
| User blocking | ❌ | Not in code or any dump (`newwtdb.block` is a CMS block table) |
| User reporting | ❌ | Not found |
| Privacy settings | ⚠️ one setting | Relationship status "Offline" (9) hides profile from search (F-05) |
| Subscription / payment | ❌ | Site is free; no payment code, tables or SDKs |
| Admin management | ✅ | F-21 |
| User verification | ⚠️ email only | Email activation (F-01); no photo/ID verification |
| Social authentication | ✅ | F-03 (Google, Twitter, Facebook, Microsoft, Apple) |
| Video / audio chat | ✅ | F-14 |
| **Additional features found** | ✅ | Friends (F-10), travel history/plans (F-15), status posts (F-16), blog (F-18), CMS pages (F-19), contact form (F-20), birthday features (F-07, F-17), zodiac/local-time display (F-05) |

## 2. Feature inventory

| ID | Feature | New module | Status in legacy |
|---|---|---|---|
| F-01 | Registration & email activation | auth | Working (security issues) |
| F-02 | Login / logout / session | auth | Working (critical issues) |
| F-03 | Social sign-in | auth | Working for Microsoft/Apple/Google; Facebook path partly broken |
| F-04 | Password reset | auth | Working (weak) |
| F-05 | Profile & account management | profiles, users | Working |
| F-06 | Photos, avatar, videos, background music | media | Working (unsafe upload) |
| F-07 | Search & discovery lists | discovery | Working |
| F-08 | Likes | likes | Working (IDOR) |
| F-09 | Favourites | favorites | Working (no auth) |
| F-10 | Friends | friends | Working (CSV model) |
| F-11 | Private messages | messages | Working |
| F-12 | Live chat | chat | Working (polling, XSS) |
| F-13 | Online presence | presence | Working (inaccurate) |
| F-14 | Video calls | video-calls | Partly broken |
| F-15 | Travel: visited / planning to visit | travel | Working |
| F-16 | Status posts & comments | posts | Working |
| F-17 | Notifications (badges, emails, birthday cron) | notifications | Working (cron leaks data) |
| F-18 | Blog & comments | blog | Working, little content |
| F-19 | CMS pages, menus, URL aliases | content | Working |
| F-20 | Contact form | contact | Working (no storage) |
| F-21 | Administration panel | admin | Working (insecure) |
| F-22 | Reference data (geo, lookups, timezone) | reference-data | Working |

## 3. Feature details

### F-01 Registration & email activation
- **What:** create an account; confirm the email before the account exists.
- **Files:** `aside-right.inc.php` (form), `homeregister_submit.php`, `account-activation.php`, `user-check/email-register-duplicate.php`; secondary path `check_reg.php` → `register-new-account.php` (probably dead).
- **Tables:** `user_tmp` → `user`; `countries` (country of birth).
- **Inputs:** first/last name, email + confirm, password, sex (1/2), birth day/month/year, country of birth, reCAPTCHA, honeypot.
- **Validations:** client: required fields, email match, password ≥ 8, age ≥ 18, reCAPTCHA ticked. Server: email/DOB/country present, honeypot empty, DOB ≤ 10 chars, email not already in `user`/`user_tmp`.
- **Business rules:** account is created in `user_tmp` with a token; activation copies it to `user` and auto-logs-in; welcome email after activation; default country 231 (USA) if missing.
- **Flow:** see existing-project-analysis §4.4.
- **Depends on:** reference-data (countries), mail.
- **Issues:** B-03, B-09 (age/captcha client-only), B-10, B-11 (tokens), duplicate detection uses `email AND provider_id`.

### F-02 Login / logout / session
- **Files:** `header.inc.php` (form + JS), `login-account.php`, `logout.php`, `php/define.php`.
- **Tables:** `user`, `online_users`.
- **Rules:** identifier = username or email; distinct responses for not-found, deleted, not activated, wrong password. Logout deletes presence row and clears `member_id`. Members lacking a name are forced to the profile page.
- **Issues:** B-01, B-02, B-31 (suspended members can log in), no throttling, "Keep me logged in" not implemented.

### F-03 Social sign-in
- **Files:** `social-login.php` + `hybridauth/` (Google, Twitter), `microsoft-login.php`, `apple-login.php` (+ `vendorHOLD/`), `facebook-php-sdk/`, `login-from-social-media.php`, `social-login-config.php`.
- **Tables:** `user` (`provider_id`), `user_social_login`, `user_tmp`.
- **Rules:** first sign-in auto-creates an active account (no email verification); username = display name, de-duplicated with a provider-id suffix; Apple users without a name must complete it; gender mapped male→1, female→2, else 0.
- **Issues:** B-01, B-04, provider names inconsistently cased, 97 of 102 social rows not linked to a member.

### F-04 Password reset
- **Files:** `forgot-password.php` (form), `forgot-mpassword.php`, `password-recover.php` (form), `mpassword-recover.php`.
- **Tables:** `user.pass_tmp`, `user.pass_date`.
- **Rules:** only active, non-deleted members; temporary code emailed; reset needs identifier + code + new password (+ confirm, client-side); old password keeps working until reset.
- **Issues:** B-11 (no expiry, guessable), B-20 (new password logged), no minimum length on server.

### F-05 Profile & account management
- **Files:** `users.php` (router by `q`), `include/user-profile.php`, `include/user-account.php`, `include/user-location.php`, `include/user-home.php` (public view), `aside-right-profile.inc.php`, `user-save.php`, `user-check/user-account.php`, `user-check/username-duplicate.php`, `user-check/old_password-check.php`, `php/php.inc.php#get_member_profile`.
- **Tables:** `user` + `race`, `height`, `education_level`, `general`, `countries`, `country_states`, `country_state_cities`, `timezones`.
- **Data:** see `documentation/module-plans/profiles/README.md`.
- **Rules:** relationship status 9 "Offline" hides the profile from search; `other_religion` only when religion = Other; "Other" looking-to-meet stores free text; profile shows age, sun sign, Chinese zodiac, local time of each location, country flag, nationality list; account page changes email/username/password (old password required).
- **Issues:** B-07 (critical), B-08, B-17.

### F-06 Photos, avatar, videos, background music
- **Files:** `include/user-photo.php`, `user-check/photo.php`, `include/user-video.php`, `include/user-background.php`, `user-check/background.php`, `user-check/user-background.php`, `php/php.inc.php#get_member_image*`.
- **Tables:** `user_photo` (14 slots), `user.img`, `user.profile_img`, `user.video`, `user.bg_music`.
- **Rules:** see `documentation/module-plans/media/README.md`.
- **Issues:** B-29 (critical), Flash MP3 player.

### F-07 Search & discovery lists
- **Files:** `search.php`, `search-check.php`, `include/zipcode.class.php`, `view/front_new_members.php`, `view/front_member_birthdays.php`, `view/member_by_con.php`, `user-friends-bday.php`, `php.inc.php#get_online_members`.
- **Tables:** `user`, `zip_code`, `countries`, `country_states`, `race`, `user_country_visited`, `online_users`.
- **Rules:** filters and visibility in `documentation/module-plans/discovery/README.md`; country matches birth country or either address.
- **Issues:** B-03.

### F-08 Likes
- **Files:** `ajax/user-like.php` (button on public profile). **Table:** `user_like` (FK + unique pair).
- **Rules:** one like per pair; email to liked member; no unlike, no match detection.
- **Issues:** B-06, B-23, debug file.

### F-09 Favourites
- **Files:** `ajax/user-favorite.php`, `favorites.php`. **Table:** `favorites`.
- **Rules:** private list; duplicates rejected; remove from list page.
- **Issues:** B-06 (no auth at all).

### F-10 Friends
- **Files:** `add-friend.php`, `accept-friend.php`, `friends.php`, `friends-requests.php`, `view/get-friends-request.php`, header badge.
- **Tables:** `friend_request`, `user.friends` (CSV).
- **Rules:** request → accept (both lists updated) / decline (request deleted); unfriend from own list.
- **Issues:** B-05, B-15, B-16; 30 dangling and 6 one-sided friendship entries in data.

### F-11 Private messages
- **Files:** `message.php`, `common/message.php`, `user-check/message.php`. **Table:** `email`.
- **Rules:** subject + body; inbox grouped by sender (paginated); opening marks read; delete is per side; unread count in header.
- **Issues:** B-26, B-03.

### F-12 Live chat
- **Files:** `chat.php` (widget on every page), `ajax/chat-script_page.php`, `js/chat-functions.js`. **Tables:** `chat`, `smilies`.
- **Rules:** opened from online members/friends; full history between two members; smilies replaced by images; undisplayed messages pop the window; webcam rows (legacy).
- **Issues:** B-18, B-19, message sent via GET.

### F-13 Online presence
- **Files:** `php/php.inc.php#online_user_check`, `get_online_users`, `logout.php`. **Table:** `online_users`.
- **Rules:** active within 300 s = online; guests counted; admin dashboard shows visitor/member counts.
- **Issues:** B-14.

### F-14 Video calls
- **Files:** `video_chat.php`, `video-call.php`, `common/video_chat.php`, `notify.php`, `polling.php`, `cancel_meeting.php`, `update_status.php`, `check_meeting_status.php`, `notify_leave.php`; legacy `webcam/start-chat.php`, `ajax/updateStratus.php`, `php/signaling.php`.
- **Tables:** `video_chat`; legacy webcam rows in `chat`.
- **Rules:** see `documentation/module-plans/video-calls/README.md` (VideoSDK prebuilt, 60-second auto-end, `Join`/`Expired`).
- **Issues:** B-12, B-13, B-04 (API key in page), unauthenticated meeting URLs.

### F-15 Travel: visited / planning to visit
- **Files:** `include/user-visited_country.php`, `include/user-visiting_country.php`, `user-check/visited_country.php`, `user-check/visiting_country.php`, `view/member_by_con.php`.
- **Tables:** `user_country_visited`, `user_visiting_country`.
- **Rules:** see `documentation/module-plans/travel/README.md`.

### F-16 Status posts & comments
- **Files:** `user-posts1.php`, `user-posts.php`, `user-posts-add.php`, `user-posts-details.php`. **Tables:** `user_posts`, `user_posts_comments`.
- **Rules:** title + text + one image; comments per post.
- **Issues:** user id from hidden field, dates without year, B-29.

### F-17 Notifications
- **Files:** `header.inc.php`, `mailer.php`, `cron.php`, `user-bday-card.php`, `wt/include/send-bulk-email.php`.
- **Rules:** header badges = unread messages + `Join` video calls; friend requests listed; emails for registration, activation, reset, likes, contact, birthdays, admin bulk mail.
- **Issues:** B-24.

### F-18 Blog & comments
- **Files:** `blog.php`, `blog_details.php`, `wt/blog_post.php`, `wt/comments.php`. **Tables:** `blog`, `blog_comments`.

### F-19 CMS pages, menus, URL aliases
- **Files:** `index.php`, `page.tpl.php`, `node.tpl.php`, `error.tpl.php`, `php.inc.php#url_alias`, `footer.inc.php`, `wt/node*.php`, `wt/page.php`, `wt/menu.php`, `wt/url_alias.php`, `wt/clock.php`.
- **Tables:** `node`, `node_type`, `page`, `menu`, `url_alias`, `worldclock`.
- **Rules:** unknown slugs resolve through `url_alias`; nodes count views; unpublished nodes redirect home.

### F-20 Contact form
- **Files:** `about-us.php`, `contact-by-message.php`, `wt/contact.php`. **Table:** `contact` (no longer written — B-27).
- **Rules:** server-side reCAPTCHA, honeypot `hidden_check=yes`, required fields, email format; emailed to the site inbox.

### F-21 Administration panel (`/wt/`)
- **Files:** `wt/*.php`, `wt/include/*.php`, `wt/common/more_action.php`, `wt/common/save.php`, `wt/common/update_priority.php`.
- **Capabilities:** see `documentation/module-plans/admin/README.md`.
- **Issues:** B-05, B-21, B-28, B-32.

### F-22 Reference data
- **Files:** `get_states.php`, `get_cities.php`, `timezoneset.php`, `php.inc.php#get_countries*`, `get_race`, `get_height`, `get_education`, `get_timezone`.
- **Tables:** `countries`, `country_states`, `country_state_cities`, `zip_code`, `timezones`, `race`, `height`, `education_level`, `general`, `smilies`.
- **Rules:** USA, India, Cambodia and the visitor's GeoIP country listed first; religion list hard-coded.

## 4. Feature dependency summary

See existing-project-analysis §11. In short: **auth** and **reference-data** are prerequisites for
everything; **presence** feeds discovery/chat; **notifications** aggregate messages, friends and video calls.
