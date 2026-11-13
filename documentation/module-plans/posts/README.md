# posts (planned)

Member status posts ("Posts" menu).

## Legacy behaviour to preserve (`user-posts1.php`, `user-posts-add.php`, `user-posts-details.php`)

- Post = `user_id, user_title (required), user_post text (required), user_picture (one image, required in form), user_date`.
- Accepted image types (client-side): jpg, jpeg, png, gif. Stored in `users/{id}/`.
- Comments: `user_posts_comments(user_id, user_post_id, user_comments, user_date)`.

## Planned endpoints (`/api/v1/posts`)

`GET /` (feed), `GET /:id`, `POST /` (multipart), `DELETE /:id`, `GET /:id/comments`, `POST /:id/comments`, `DELETE /comments/:id`.

## Must NOT reproduce

`user_id` taken from a hidden form field; dates stored as "August 05 03:54:42 pm" strings **without a year**;
post id found with `ORDER BY web_id DESC LIMIT 1` after insert (race condition); comments reference posts that no longer exist.
