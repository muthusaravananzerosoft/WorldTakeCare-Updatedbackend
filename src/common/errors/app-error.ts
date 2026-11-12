import { ERROR_CODES, type ErrorCode } from '../constants/error-codes.constants.js';
import { HTTP_STATUS } from '../constants/http-status.constants.js';

/**
 * Expected (operational) error. Throw from services/controllers; the central
 * error middleware converts it to the standard JSON error response.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST, message, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, message);
  }

  static conflict(message: string) {
    return new AppError(HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, message);
  }

  static notImplemented(message = 'This endpoint is not implemented yet') {
    return new AppError(HTTP_STATUS.NOT_IMPLEMENTED, ERROR_CODES.NOT_IMPLEMENTED, message);
  }
}
