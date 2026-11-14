import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { healthController } from '../controllers/health.controller.js';

export const healthRouter = Router();

healthRouter.get('/', asyncHandler(healthController.getHealth));
