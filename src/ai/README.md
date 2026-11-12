# AI layer

Not implemented. **The legacy PHP application contains no AI functionality.**

This folder is a reserved boundary so that future AI features (for example match
suggestions, profile-photo moderation, message spam/abuse detection, or translation —
relevant because WorldTaker members are international) are added behind interfaces and
called from module services, never directly from controllers.

Rules when work starts:

- Each capability gets an interface here (e.g. `ModerationService`) and a provider adapter
  in `src/integrations/`.
- Calls are asynchronous and must not block core flows (registration, messaging).
- No member data is sent to a third-party model without an approved privacy review.
