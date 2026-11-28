import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { discoveryController } from '../controllers/discovery.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { memberDiscoveryQuerySchema } from '../validators/discovery.validation.js';

export const discoveryRouter = Router();

discoveryRouter.get(
  '/members',
  validate({ query: memberDiscoveryQuerySchema }),
  asyncHandler(discoveryController.listMembers),
);
