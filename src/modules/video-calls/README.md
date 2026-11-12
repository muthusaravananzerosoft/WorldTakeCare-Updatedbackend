# video-calls (planned)

One-to-one video calls.

## Legacy behaviour to preserve (current implementation: VideoSDK.live)

- Caller opens `video_chat.php?meetingId=&person1={caller}&person2={callee}`; a `video_chat` row is inserted
  (`use_id`=caller, `chat_use_id`=callee, `url`, `status='Join'`, `created_at`) unless an un-expired one exists.
- VideoSDK prebuilt UI (mic + webcam + in-call chat, no screen share).
- Meeting is force-ended after **60 seconds** (`cancel_meeting.php` sets `status='Expired'`).
- `video-call.php` lists calls received; pending `Join` calls count toward the header message badge.
- Incoming-call prompt via `polling.php` every 8 s ("Incoming video call. Click OK to join.").

## Planned endpoints (`/api/v1/video-calls`) + realtime events

`POST /` (callee) → meeting id + participant token, `GET /` (history), `POST /:id/join`, `POST /:id/end`,
`POST /:id/decline`; events `call:incoming`, `call:accepted`, `call:ended`.

## Must NOT reproduce

B-12 incoming-call notice stored in the **caller's** PHP session (callee never receives it) ·
B-13 `update_status.php`, `check_meeting_status.php`, `notify_leave.php` query a non-existent `video_id` column ·
VideoSDK API key embedded in page source · meeting URL with participant ids in the query string (anyone can join) ·
legacy Flash webcam (`webcam/`, `ScriptCam-master/`, `ajax/updateStratus.php`) and unused `php/signaling.php`.

**Decision needed:** confirm the 60-second limit is intended (looks like a trial limit).
