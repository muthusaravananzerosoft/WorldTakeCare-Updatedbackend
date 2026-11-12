# messages (planned)

Asynchronous private messages ("Message" menu). Legacy table name is misleadingly `email`.

## Legacy behaviour to preserve (`message.php`, `common/message.php`, table `email`)

- Message = `sender, receiver, subject, body, send_date (unix seconds as varchar)`.
- Per-side flags: `readby_sender`, `readby_receiver`, `deleteby_sender`, `deleteby_receiver`.
- Inbox groups by sender (latest message per sender, paginated). Opening a thread marks received messages read.
- Deleting a thread soft-deletes for the current side only.
- Unread count (`readby_receiver=0`) feeds the header badge (plus pending video invites).
- Only logged-in members can send.

## Planned endpoints (`/api/v1/messages`)

`GET /conversations`, `GET /conversations/:userId`, `POST /` (to, subject, body),
`POST /conversations/:userId/read`, `DELETE /conversations/:userId`, `GET /unread-count`.

## Must NOT reproduce

B-26 delete query has broken `AND … OR …` precedence (can flag other members' messages) ·
no recipient existence/blocked check · body stored unsanitised.
