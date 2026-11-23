import type { CorsOptions } from 'cors';
import { AppError } from '../common/errors/app-error.js';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { env } from './env.config.js';

// Built-in allowed origins — the live frontend domains (http + https) and
// local dev servers, so the API works even if CORS_ORIGINS is incomplete.
const defaultOrigins = [
  'http://web.worldtaker.zerosoft.in',
  'http://worldtaker.zerosoft.in',
  'http://www.worldtaker.zerosoft.in',
  'https://web.worldtaker.zerosoft.in',
  'https://worldtaker.zerosoft.in',
  'https://www.worldtaker.zerosoft.in',
  'http://localhost:3000',
  'http://localhost:3001',
];

const allowedOrigins = new Set([...defaultOrigins, ...env.CORS_ORIGINS]);

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
