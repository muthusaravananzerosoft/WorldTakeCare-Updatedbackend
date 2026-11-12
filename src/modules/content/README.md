# content (planned)

Lightweight CMS that serves static pages.

## Legacy behaviour to preserve

- **URL aliases** (`url_alias`): a friendly path (`about-us`, `terms-of-use`, `privacy-policy`, `thanks-registered`, …)
  maps to `src` (`node` or `page`) + `src_id`. `.htaccess` sends every unknown path to `index.php?q={path}` → `url_alias()`.
- **Nodes** (`node`): title, HTML body, image, `published`, `view_count` (incremented on each view),
  author/editor ids, `fndt_id` → `node_type` (Page, Story).
- **Pages** (`page`): name, machine name, body, published (used for e.g. "search", "contact-me").
- **Menus** (`menu`): hierarchical via `fmen_id` (footer: About/Contact, Terms, Privacy), `priority`, `published`.
- World clock embed (`worldclock.embed_code`) managed by admin.

## Planned endpoints (`/api/v1/content`)

`GET /pages/:slug` (resolves alias → node/page, increments view count), `GET /menus/:id`.
Admin CRUD under `/api/v1/admin/content`.

## Notes

In a Next.js frontend these pages may be better served by the frontend/headless CMS — **decision needed**.
`url_alias` contains junk rows (`-0`, `page/age/age/age/orgot-password`) that must not be migrated.
