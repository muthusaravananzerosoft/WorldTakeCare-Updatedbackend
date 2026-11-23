import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { guideProfileController } from '../controllers/guide-profile.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  guideIdParamSchema,
  listGuidesQuerySchema,
} from '../validators/guide-profile.validation.js';

/**
 * Public guide directory — published profiles only, no auth required.
 * Mounted AFTER the /guides/me/* router so "me" never hits the :id param.
 */
export const guideRouter = Router();

guideRouter.get(
  '/',
  validate({ query: listGuidesQuerySchema }),
  asyncHandler(guideProfileController.listPublic),
);

guideRouter.get(
  '/:id',
  validate({ params: guideIdParamSchema }),
  asyncHandler(guideProfileController.getPublicById),
);
