# Realtime layer (WebSockets)

Not implemented yet. This folder will host the WebSocket server that attaches to the
same HTTP server created in `src/server.ts`, sharing authentication with the REST API.

## Why it is needed — legacy behaviour it replaces

| Legacy mechanism (PHP) | Poll interval / source | Realtime replacement |
|---|---|---|
| Chat messages fetched by AJAX polling `ajax/chat-script_page.php?get` | `js/chat-functions.js` | `chat:message` event |
| "New chat from X" pop-up via `?chat=new` polling | `js/chat-functions.js` | `chat:incoming` event |
| Incoming video call via `polling.php` every **8 s** (state stored in the *caller's* PHP session — only works for the same browser session, see bug B-12) | `index.php` | `call:incoming`, `call:accepted`, `call:ended` events |
| Online status recomputed on every page load (`online_user_check`, 5-minute window) | `php/define.php` | connection-based presence: `presence:online` / `presence:offline` |
| Header badge counts recomputed on every page load | `header.inc.php` | `notification:counts` event |

## Planned structure

```
realtime/
  socket-server.ts     # attach to http.Server, authenticate the handshake
  events.ts            # typed event names + payloads (shared with clients)
  handlers/            # chat, presence, calls, notifications
```

REST remains the source of truth for writes (mobile apps can use either); the socket
layer only pushes events. A shared pub/sub (e.g. Redis) will be needed once the API runs
on more than one instance — decision pending.
