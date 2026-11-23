import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { destinationController } from '../controllers/destination.controller.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  attractionsQuerySchema,
  destinationIdParamSchema,
  destinationSearchQuerySchema,
} from '../validators/destination.validation.js';

/**
 * Destination search + tourist attraction endpoints. Read-only and public;
 * a moderate limiter guards the routes that can trigger paid provider calls.
 */
const searchLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

export const destinationRouter = Router();

destinationRouter.get('/', destinationController.info);

destinationRouter.get(
  '/search',
  searchLimiter,
  validate({ query: destinationSearchQuerySchema }),
  asyncHandler(destinationController.search),
);

destinationRouter.get(
  '/:id',
  validate({ params: destinationIdParamSchema }),
  asyncHandler(destinationController.getById),
);

destinationRouter.get(
  '/:id/attractions',
  searchLimiter,
  validate({ params: destinationIdParamSchema, query: attractionsQuerySchema }),
  asyncHandler(destinationController.getAttractions),
);
