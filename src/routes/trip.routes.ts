import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { tripController } from '../controllers/trip.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createTripBodySchema,
  tripIdParamSchema,
  updateTripBodySchema,
} from '../validators/trip.validation.js';

/**
 * My Trips — authenticated CRUD. Every route requires a Bearer token; the
 * user id comes from req.user, never from the request body.
 */
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

export const tripRouter = Router();

tripRouter.get('/', requireAuth, asyncHandler(tripController.list));

tripRouter.post(
  '/',
  writeLimiter,
  requireAuth,
  validate({ body: createTripBodySchema }),
  asyncHandler(tripController.create),
);

tripRouter.get(
  '/:id',
  requireAuth,
  validate({ params: tripIdParamSchema }),
  asyncHandler(tripController.getById),
);

tripRouter.patch(
  '/:id',
  writeLimiter,
  requireAuth,
  validate({ params: tripIdParamSchema, body: updateTripBodySchema }),
  asyncHandler(tripController.update),
);

tripRouter.delete(
  '/:id',
  writeLimiter,
  requireAuth,
  validate({ params: tripIdParamSchema }),
  asyncHandler(tripController.remove),
);
