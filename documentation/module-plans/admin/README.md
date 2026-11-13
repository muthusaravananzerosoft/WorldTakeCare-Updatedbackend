# admin (planned)

Replaces the `/wt/` administrator panel. Access = members with `user.roles = 1` (`is_administrator()`).

## Legacy capabilities to preserve

| Area | Actions | Legacy file |
|---|---|---|
| Dashboard | visitor/member online counts, random online members, shortcuts | `wt/index.php` |
| Members | list/search, edit account & personal info, **suspend / unsuspend**, **soft delete / restore**, **hard delete** (removes user, photos, favorites, friend requests, social login, upload folder) | `wt/member.php`, `wt/suspended_member.php`, `wt/deleted_member.php`, `wt/account-info.php`, `wt/personal-info.php`, `wt/common/more_action.php` |
| Pending registrations | list `user_tmp`, **transfer** (activate manually), **resend activation**, delete | `wt/include/temp_member.php`, `more_action.php` |
| Content | nodes, node types, pages, menus, URL aliases, publish/unpublish | `wt/node.php`, `wt/node_type.php`, `wt/page.php`, `wt/menu.php`, `wt/url_alias.php` |
| Blog | posts, comments | `wt/blog_post.php`, `wt/comments.php` |
| Reference data | countries, states, cities, timezones, race, height, education, general tags, priority ordering | `wt/countries.php`, `wt/states.php`, `wt/cities.php`, `wt/time-zone.php`, …, `wt/common/update_priority.php` |
| Communication | contact inbox, emails list, bulk email | `wt/contact.php`, `wt/emails.php`, `wt/include/send-bulk-email.php` |
| World clock | edit embed code | `wt/clock.php` |

## Planned endpoints

`/api/v1/admin/members…`, `/admin/pending-members…`, `/admin/content…`, `/admin/blog…`,
`/admin/reference-data…`, `/admin/contact…`, `/admin/bulk-email`, `/admin/stats` — all behind
`requireRole('admin')` plus an audit log (new).

## Must NOT reproduce

B-05 every destructive action is a GET link without CSRF protection · hard delete leaves orphans in
`user_like`, `chat`, `email`, `user_posts`, travel tables · `wt/login.php` queries non-existent columns
(`user`, `pass`, `name`) — dead code (B-21).
