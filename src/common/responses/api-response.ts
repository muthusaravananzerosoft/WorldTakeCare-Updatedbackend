import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../constants/http-status.constants.js';
import type { ErrorCode } from '../constants/error-codes.constants.js';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from '../interfaces/api-response.interface.js';

function buildMeta(req: Request) {
  return { requestId: req.id, timestamp: new Date().toISOString() };
}

export function sendSuccess<T>(
  req: Request,
  res: Response,
  data: T,
  statusCode: number = HTTP_STATUS.OK,
  pagination?: PaginationMeta,
) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    meta: pagination ? { ...buildMeta(req), pagination } : buildMeta(req),
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  req: Request,
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorResponse = {
    success: false,
    error: details === undefined ? { code, message } : { code, message, details },
    meta: buildMeta(req),
  };
  return res.status(statusCode).json(body);
}
