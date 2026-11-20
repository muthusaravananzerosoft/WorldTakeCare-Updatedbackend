# Posts — travel posts + comments

Status: **implemented** (v1)

## Purpose

The travel feed: members publish travel posts (title, description, one
image, published date) and other members comment. Reading is public;
writing requires a Bearer token.

## Endpoints

| Method | Path                                  | Auth     | Description              |
| ------ | ------------------------------------- | -------- | ------------------------ |
| GET    | `/api/v1/posts?page=&limit=`          | public   | Paginated post feed      |
| POST   | `/api/v1/posts`                       | required | Create a post            |
| GET    | `/api/v1/posts/:id`                   | public   | Post detail              |
| PATCH  | `/api/v1/posts/:id`                   | owner/admin | Update post           |
| DELETE | `/api/v1/posts/:id`                   | owner/admin | Delete post           |
| GET    | `/api/v1/posts/:id/comments`          | public   | Paginated comments       |
| POST   | `/api/v1/posts/:id/comments`          | required | Add comment              |
| PATCH  | `/api/v1/posts/:id/comments/:cid`     | owner/admin | Edit comment          |
| DELETE | `/api/v1/posts/:id/comments/:cid`     | owner/admin | Delete comment        |

## Rules

- User id always comes from the token (`req.user`) — never the body.
- Non-owner edits/deletes get **404** (existence is not leaked); admins
  bypass the owner check via `role === 'admin'`.
- `readingTimeMin` is auto-calculated (~200 words/min, min 1) on create
  and when `description` is patched.
- `imageUrl` stores a URL/storage reference only — never binary. When a
  `MediaStorage` implementation lands, upload routes can store via it and
  save the returned URL here.
- `createdAt`/`updatedAt` are ISO timestamps — the frontend renders
  `Nov 10, 2026` / "6 mins ago" itself.
- Pagination: `?page=` (≥1) + `?limit=` (1–50, default 10); responses
  include `total` + `totalPages`.

## Tables

- `posts` — `user_id` → `user.use_id` (CASCADE), title, description,
  `image_url`, `published_date`, `reading_time_min`.
- `post_comments` — `post_id` → `posts` (CASCADE) + `user_id` → `user`
  (CASCADE), comment text.
- Legacy `user_posts` / `user_posts_comments` left untouched.

Migration: `database/migrations/2026-11-19d_posts.sql`
