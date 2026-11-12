import type { ValidatedRequestData } from '../../middleware/validate.middleware.js';

declare global {
  namespace Express {
    interface Request {
      /** Correlation id set by request-id middleware (also sent as X-Request-Id). */
      id: string;
    }

    interface Locals {
      /** Parsed + coerced request parts set by validate(). Controllers read from here, not from req directly. */
      validated: ValidatedRequestData;
    }
  }
}

export {};
