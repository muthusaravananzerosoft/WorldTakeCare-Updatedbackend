import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { AppError } from '../common/errors/app-error.js';
import { sendError } from '../common/responses/api-response.js';
import { appConfig } from '../config/app.config.js';

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

/**
 * Central error handler — the only place that turns errors into HTTP responses.
 * Unexpected errors are logged with the request id and never leak internals in production.
 */
export const errorMiddleware: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (res.headersSent) {
    req.socket.destroy();
    return;
  }

  if (err instanceof AppError) {
    sendError(req, res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(
      req,
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      'Validation failed',
      err.issues,
    );
    return;
  }

  const parserError = err as BodyParserError;
  if (parserError?.type === 'entity.parse.failed') {
    sendError(
      req,
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.INVALID_JSON,
      'Request body contains invalid JSON',
    );
    return;
  }
  if (parserError?.type === 'entity.too.large') {
    sendError(
      req,
      res,
      HTTP_STATUS.PAYLOAD_TOO_LARGE,
      ERROR_CODES.PAYLOAD_TOO_LARGE,
      'Request body is too large',
    );
    return;
  }

  if (err instanceof MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    sendError(
      req,
      res,
      tooLarge ? HTTP_STATUS.PAYLOAD_TOO_LARGE : HTTP_STATUS.BAD_REQUEST,
      tooLarge ? ERROR_CODES.PAYLOAD_TOO_LARGE : ERROR_CODES.BAD_REQUEST,
      tooLarge ? 'Uploaded file is too large' : `Upload failed: ${err.message}`,
    );
    return;
  }

  console.error(`[${req.id}] Unhandled error:`, err);
  const message =
    !appConfig.isProduction && err instanceof Error ? err.message : 'An unexpected error occurred';
  sendError(req, res, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, message);
};
