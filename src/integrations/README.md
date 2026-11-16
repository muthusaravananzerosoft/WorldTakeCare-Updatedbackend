# Integrations (external services)

Every third-party service is wrapped in an adapter behind a TypeScript interface, so
modules depend on *what* they need (e.g. `MailSender`) and never on a vendor SDK.
Swapping a provider is a change in this folder only.

**Status: interfaces defined — implementations arrive once API keys/accounts are provided.**

| Folder | Interface file | Status | Source |
|---|---|---|---|
| `mail/` | `mail-sender.interface.ts` — `MailSender.send({ to, subject, html, text })` | interface ready | Legacy: welcome, activation, password reset, like-notify, contact, birthday mail (`mailer.php`, `cron.php`) |
| `social-auth/` | `social-auth.interface.ts` — `SocialAuthProvider.exchange(code) → SocialProfile` | interface ready | Legacy: Google + Twitter (Hybridauth v2), Microsoft + Apple (Hybridauth v3), Facebook PHP SDK |
| `video/` | `video-provider.interface.ts` — `VideoProvider.createMeeting() / .createToken()` | interface ready | Legacy: VideoSDK.live (`video_chat.php`) |
| `captcha/` | `captcha-verifier.interface.ts` — `CaptchaVerifier.verify(token, ip)` | interface ready | Legacy: reCAPTCHA v2 (registration, contact) |
| `geoip/` | `geo-ip.interface.ts` — `GeoIpLookup.lookup(ip)` | interface ready | Legacy: ipinfo.io country pre-selection |
| `storage/` | `media-storage.interface.ts` — `MediaStorage.put/getUrl/delete(key)` | interface ready | Legacy: `users/{id}/` disk folders (photos, avatar, music) |
| `chat/` | `chat-provider.interface.ts` — `ChatProvider.publish/subscribe/markRead` | interface ready | **New (lead decision): Firebase** replaces legacy chat polling |
| `maps/` | `maps-provider.interface.ts` — `MapsProvider.geocode/reverseGeocode` | interface ready | **New (lead decision): Google Maps** — use-cases to confirm |
| `ai/` | `ai-provider.interface.ts` — `AiProvider.complete(messages)` | interface ready | **New (lead decision): OpenAI** — see `src/ai/README.md` |
| `newsletter/` | — | needs decision | Mailchimp SDK present in legacy web root but never called |

## Security rule

The legacy source contains live secrets (SMTP password, Google/Twitter/Microsoft OAuth
secrets, Apple private key, VideoSDK key, ipinfo token, reCAPTCHA secret). **None may be
copied.** All must be rotated before go-live and supplied through environment variables —
the reserved names are listed in `.env.example`.
