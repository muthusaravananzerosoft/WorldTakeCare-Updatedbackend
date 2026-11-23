import { Router } from 'express';
import { USER_ROLES } from '../common/constants/auth.constants.js';
import { asyncHandler } from '../common/utils/async-handler.js';
import { featuredCountryController } from '../controllers/featured-country.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createFeaturedCountryBodySchema,
  featuredCountryIdParamSchema,
  updateFeaturedCountryBodySchema,
} from '../validators/featured-country.validation.js';

/**
 * Admin management of featured countries — mounted at
 * /admin/featured-countries. All routes require an admin Bearer token.
 */
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

export const adminFeaturedCountryRouter = Router();

adminFeaturedCountryRouter.post(
  '/',
  writeLimiter,
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate({ body: createFeaturedCountryBodySchema }),
  asyncHandler(featuredCountryController.create),
);

adminFeaturedCountryRouter.patch(
  '/:id',
  writeLimiter,
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate({ params: featuredCountryIdParamSchema, body: updateFeaturedCountryBodySchema }),
  asyncHandler(featuredCountryController.update),
);

adminFeaturedCountryRouter.delete(
  '/:id',
  writeLimiter,
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  validate({ params: featuredCountryIdParamSchema }),
  asyncHandler(featuredCountryController.remove),
);
