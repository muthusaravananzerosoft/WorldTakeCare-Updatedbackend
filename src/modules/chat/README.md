# chat (planned)

Live one-to-one text chat window (bottom-right pop-up on every page).

## Legacy behaviour to preserve (`chat.php`, `ajax/chat-script_page.php`, `js/chat-functions.js`, tables `chat`, `smilies`)

- Opened from the online-members / online-friends lists.
- Send: `chat(use_id=sender, chat_use_id=receiver, msg, timestamp, online=1, displayed=0)`.
- Fetch: full history between the two members; receiver's undisplayed rows marked `displayed=1`.
- "New chat" check returns the first sender with undisplayed messages to pop the window open.
- Smilie codes (`:)`, `:D` …, table `smilies`) replaced with images `img/smilies/{id}.gif`, longest code first.
- Special rows with `msg='webcam'` are legacy video invitations: `action` 1 = invite, 2 = accepted, -1 = missed;
  `stratus` = Adobe Stratus peer key (Flash, obsolete).

## Planned endpoints (`/api/v1/chat`) + realtime events (`src/realtime`)

`GET /conversations/:userId/messages?before=`, `POST /conversations/:userId/messages`,
`POST /conversations/:userId/seen`, `GET /smilies`; events `chat:message`, `chat:incoming`, `chat:seen`.

## Must NOT reproduce

B-18 reflected XSS (raw `$_GET['content']` echoed back) · B-19 timestamps as strings in mixed formats ·
polling every few seconds · messages sent via GET query string · `chat_new` duplicate table.

**Decision needed:** keep chat and private messages as two products (legacy) or merge into one conversation model.
