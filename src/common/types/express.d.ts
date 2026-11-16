import type { AuthUser } from '../../middleware/auth.middleware.js';
import type { ValidatedRequestData } from '../../middleware/validate.middleware.js';

declare global {
  namespace Express {
    interface Request {
      /** Correlation id set by request-id middleware (also sent as X-Request-Id). */
      id: string;
      /** Verified token claims — set by requireAuth only, never from request fields. */
      user?: AuthUser;
    }

    interface Locals {
      /** Parsed + coerced request parts set by validate(). Controllers read from here, not from req directly. */
      validated: ValidatedRequestData;
    }
  }
}

export {};
