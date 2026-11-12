import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { AppError } from '../common/errors/app-error.js';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export interface ValidatedRequestData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

/**
 * Validates request parts with Zod. On success the parsed values are placed in
 * `res.locals.validated` (Express 5 makes `req.query` read-only, so we never mutate it).
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, res, next) => {
    const validated: ValidatedRequestData = {};
    const issues: { location: string; path: string; message: string }[] = [];

    for (const location of ['params', 'query', 'body'] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = schema.safeParse(req[location]);
      if (result.success) {
        validated[location] = result.data;
      } else {
        for (const issue of result.error.issues) {
          issues.push({ location, path: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (issues.length > 0) {
      next(
        new AppError(
          HTTP_STATUS.BAD_REQUEST,
          ERROR_CODES.VALIDATION_ERROR,
          'Validation failed',
          issues,
        ),
      );
      return;
    }

    res.locals.validated = validated;
    next();
  };
}
