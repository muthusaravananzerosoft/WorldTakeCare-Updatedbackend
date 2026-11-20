import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { connectionController } from '../controllers/connection.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  connectionIdParamSchema,
  createConnectionBodySchema,
  listConnectionsQuerySchema,
} from '../validators/connection.validation.js';

/**
 * Member–Guide connection requests. Every route requires a Bearer token; the
 * requester/recipient identity comes from req.user, never from the body.
 * An `accepted` status is the gate future Chat APIs must check.
 */
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

export const connectionRouter = Router();

connectionRouter.get(
  '/',
  requireAuth,
  validate({ query: listConnectionsQuerySchema }),
  asyncHandler(connectionController.list),
);

connectionRouter.post(
  '/',
  writeLimiter,
  requireAuth,
  validate({ body: createConnectionBodySchema }),
  asyncHandler(connectionController.create),
);

connectionRouter.get(
  '/:id',
  requireAuth,
  validate({ params: connectionIdParamSchema }),
  asyncHandler(connectionController.getById),
);

connectionRouter.patch(
  '/:id/accept',
  writeLimiter,
  requireAuth,
  validate({ params: connectionIdParamSchema }),
  asyncHandler(connectionController.accept),
);

connectionRouter.patch(
  '/:id/decline',
  writeLimiter,
  requireAuth,
  validate({ params: connectionIdParamSchema }),
  asyncHandler(connectionController.decline),
);
