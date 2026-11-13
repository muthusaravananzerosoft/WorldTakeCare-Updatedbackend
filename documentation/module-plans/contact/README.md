# contact (planned)

## Legacy behaviour to preserve (`contact-by-message.php`, `about-us.php`)

- Public form: email, subject, message — all required; email format validated.
- Server-side reCAPTCHA verification and a hidden field `hidden_check` that must equal `yes`.
- Sends an email to the site inbox with the submission.
- Admin contact inbox (`wt/contact.php`) reads table `contact` (`read_status`, `new_msg` flags).

## Planned endpoints (`/api/v1/contact`)

`POST /` (public, rate-limited); admin listing under `/api/v1/admin/contact`.

## Notes

The current handler **no longer writes to `contact`** (it only emails) — the table holds old, mostly
spam rows from 2017. Decide whether to store submissions again (recommended, with spam filtering).
