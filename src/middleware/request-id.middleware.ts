import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { REQUEST_ID_HEADER } from '../common/constants/api.constants.js';

const SAFE_ID = /^[A-Za-z0-9._-]{1,100}$/;

/** Reuses a well-formed incoming X-Request-Id (from a proxy/client) or generates one. */
export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.get(REQUEST_ID_HEADER);
  req.id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, req.id);
  next();
};
