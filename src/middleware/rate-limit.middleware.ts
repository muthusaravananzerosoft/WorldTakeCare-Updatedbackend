import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { AppError } from '../common/errors/app-error.js';
import { env } from '../config/env.config.js';

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

/**
 * Creates an IP-based rate limiter. Exceeding the limit produces the standard
 * 429 JSON error instead of an HTML/plain-text response.
 */
export function createRateLimiter(options: RateLimitOptions = {}): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs ?? env.RATE_LIMIT_WINDOW_MS,
    limit: options.max ?? env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(
        new AppError(
          HTTP_STATUS.TOO_MANY_REQUESTS,
          ERROR_CODES.TOO_MANY_REQUESTS,
          'Too many requests, please try again later',
        ),
      );
    },
  });
}

/** Default limiter mounted on /api/v1. Sensitive routes (login, password reset) get stricter limiters. */
export const apiLimiter = createRateLimiter();
