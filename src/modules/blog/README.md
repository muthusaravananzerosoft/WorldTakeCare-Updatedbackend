# blog (planned)

## Legacy behaviour to preserve (`blog.php`, admin `wt/blog_post.php`, `wt/comments.php`)

- Admin creates/edits/deletes posts: `web_title`, `web_content` (HTML, ≤5000 chars), `img` (stored in `img/node/`), `time`.
- Members comment: `blog_comments(blog_id, user_id, comments, time)`; admin can review comments.

## Planned endpoints (`/api/v1/blog`)

Public: `GET /posts`, `GET /posts/:id`, `GET /posts/:id/comments`; member: `POST /posts/:id/comments`;
admin endpoints live under `/api/v1/admin/blog`.

## Notes

Only one blog post exists in the current dump and 8 comments reference posts that no longer exist —
low priority; confirm with the team whether blog is kept.
