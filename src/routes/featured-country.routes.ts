import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { featuredCountryController } from '../controllers/featured-country.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  featuredCountryIdParamSchema,
  featuredCountryQuerySchema,
} from '../validators/featured-country.validation.js';

/**
 * Top Tourist Countries — public curated list. Admin management lives in
 * admin-featured-country.routes.ts under /admin.
 */
export const featuredCountryRouter = Router();

featuredCountryRouter.get(
  '/',
  validate({ query: featuredCountryQuerySchema }),
  asyncHandler(featuredCountryController.list),
);

featuredCountryRouter.get(
  '/:id',
  validate({ params: featuredCountryIdParamSchema }),
  asyncHandler(featuredCountryController.getById),
);
