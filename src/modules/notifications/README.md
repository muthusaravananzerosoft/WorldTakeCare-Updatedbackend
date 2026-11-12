# notifications (planned)

**The legacy app has no notifications table or notification centre.** "Notifications" today are:

| Kind | Legacy source |
|---|---|
| Header badge: unread messages + pending video calls | `header.inc.php` (`email.readby_receiver=0`, `video_chat.status='Join'`) |
| Header: pending friend requests | `header.inc.php` (`friend_request`) |
| Email: welcome / activation | `homeregister_submit.php`, `register-new-account.php`, `account-activation.php` |
| Email: password reset code | `forgot-mpassword.php` |
| Email: "X liked your profile" | `ajax/user-like.php` |
| Email: birthday wishes (daily cron) | `cron.php` → external `curl_bday_mail.php`, `user-bday-card.php` |
| Email: admin bulk email | `wt/include/send-bulk-email.php` |

## Planned endpoints (`/api/v1/notifications`)

`GET /counts` (badge counts — direct replacement of header logic). An in-app notification feed
(`GET /`, `POST /:id/read`) and push notifications for mobile are **new scope — needs approval**.

## Must NOT reproduce

B-24 the birthday cron POSTs every birthday member's email and name to a third-party domain
(`zerosofttech.com`) and creates a new empty file in the web root on each run.
