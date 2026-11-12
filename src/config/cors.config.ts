import type { CorsOptions } from 'cors';
import { AppError } from '../common/errors/app-error.js';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { env } from './env.config.js';

const allowedOrigins = new Set(env.CORS_ORIGINS);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header (mobile apps, curl, server-to-server)
    // are not subject to browser CORS and are allowed through.
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(
      new AppError(
        HTTP_STATUS.FORBIDDEN,
        ERROR_CODES.CORS_NOT_ALLOWED,
        `Origin ${origin} is not allowed`,
      ),
    );
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 600,
};
