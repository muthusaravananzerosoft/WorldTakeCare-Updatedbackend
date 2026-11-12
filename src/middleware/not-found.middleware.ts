import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { sendError } from '../common/responses/api-response.js';

export const notFoundMiddleware: RequestHandler = (req, res) => {
  sendError(
    req,
    res,
    HTTP_STATUS.NOT_FOUND,
    ERROR_CODES.ROUTE_NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`,
  );
};
