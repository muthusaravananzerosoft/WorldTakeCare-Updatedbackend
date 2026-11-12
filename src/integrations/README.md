# Integrations (external services)

Every third-party service is wrapped in an adapter behind a TypeScript interface, so
modules depend on *what* they need (e.g. `MailSender`) and never on a vendor SDK.
Swapping a provider is a change in this folder only.

Planned adapters, all **confirmed in the legacy PHP source**:

| Folder (planned) | Interface | Legacy usage | Legacy files |
|---|---|---|---|
| `mail/` | `MailSender.send({ to, subject, html, text })` | Welcome, activation link, password-reset code, "X liked your profile", contact form, admin resend-activation, birthday wishes | `mailer.php` (PHPMailer SMTP SSL/465), `php/mail/mail.function.php` (older sendmail path), `cron.php` |
| `social-auth/` | `SocialAuthProvider.exchange(code) → { providerId, email, firstName, lastName }` | Google + Twitter (Hybridauth v2), Microsoft Graph + Apple (Hybridauth v3), Facebook (PHP SDK) | `social-login.php`, `microsoft-login.php`, `apple-login.php`, `facebook-php-sdk/`, `social-login-config.php` |
| `video/` | `VideoProvider.createMeeting()` / `.createToken(userId, meetingId)` | VideoSDK.live prebuilt RTC (one-to-one calls). Legacy Flash ScriptCam/Adobe Stratus is obsolete — not migrated | `video_chat.php`, `webcam/start-chat.php` |
| `captcha/` | `CaptchaVerifier.verify(token, ip)` | Google reCAPTCHA v2 on registration (client only) and contact form (server-verified) | `check_reg.php`, `contact-by-message.php` |
| `geoip/` | `GeoIpLookup.countryCode(ip)` | ipinfo.io — pre-selects the visitor's country in country dropdowns | `php/php.inc.php#get_countries_orderby` |
| `storage/` | `MediaStorage.put/get/delete(key)` | Local disk `users/{id}/` (gallery), `users/{id}/avata/` (avatar), `img/node/` (CMS/blog images) | `user-check/photo.php`, `user-check/background.php`, `wt/common/save.php` |
| `newsletter/` *(needs decision)* | — | Mailchimp PHP SDK is present in the web root but **no application code calls it** | `Mailchimp.php`, `mailchimp/` |

## Security rule

The legacy source contains live secrets (SMTP password, Google/Twitter/Microsoft OAuth
secrets, Apple private key, VideoSDK key, ipinfo token, reCAPTCHA secret). **None may be
copied.** All must be rotated before go-live and supplied through environment variables.
