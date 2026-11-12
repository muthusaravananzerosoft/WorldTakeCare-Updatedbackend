# auth (planned)

Replaces session-based PHP authentication (`$_SESSION['member_id']`).

## Legacy behaviour to preserve

- **Login** (`login-account.php`): identifier = username **or** email (case-sensitive `BINARY` match).
  Distinct outcomes: not found / deleted (`isdel=1`) / not activated (`active=0`) / wrong password / success.
  Frontend shows "deleted by admin" and "not activated" messages — keep these as distinct error codes.
- **Registration — email-activation path** (homepage form, `homeregister_submit.php`): fields
  `fname, lname, email (+confirm), password (min 8), sex (1=male, 2=female), dob (day/month/year), fdob_con_id (country)`;
  honeypot `check_val` must be empty; row goes to `user_tmp` with token `qr`; email contains
  `account-activation.php?id=&qr=`. Activation copies `user_tmp` → `user`, sets `activated_date`, deletes the tmp row, logs the user in.
- **Registration — immediate path** (`check_reg.php` → `register-new-account.php`, social pre-fill):
  inserts straight into `user` (active by default) and sends a welcome email. Not linked from any page and
  depends on a missing include — probably dead. **Do not reproduce**: every new account verifies its email.
- **Duplicate check**: email must not exist in `user` or `user_tmp`.
- **Password reset**: request by email → random code saved in `user.pass_tmp`, `pass_date`; emailed.
  Reset with identifier + code + new password; clears `pass_tmp`. Old password stays valid until reset.
- **Social sign-in**: Google, Twitter (Hybridauth v2), Microsoft, Apple (Hybridauth v3), Facebook SDK.
  First sign-in creates `user` (provider id in `user.provider_id`) + `user_social_login` row.
  Apple may return no name → user is forced to complete first/last name before using the site.
- **Logout**: removes the member from `online_users`.
- 18+ only; reCAPTCHA on registration.

## Planned endpoints (`/api/v1/auth`)

`POST /register`, `POST /activate`, `POST /resend-activation`, `POST /login`, `POST /refresh`,
`POST /logout`, `POST /password/forgot`, `POST /password/reset`, `GET /email-availability`,
`GET /social/:provider` + `GET|POST /social/:provider/callback`.

## Must NOT reproduce

B-01 `login-from-social-media.php` sets the session from a URL parameter (auth bypass) ·
B-02 unsalted MD5 passwords → use Argon2id/bcrypt with rehash-on-login ·
B-09 age check client-side only → enforce server-side ·
B-11 guessable activation/reset tokens with no expiry → 32-byte random, hashed, expiring, single-use ·
B-20 password reset POST bodies written to `debug.log`.
