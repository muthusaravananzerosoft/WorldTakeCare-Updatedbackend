import { Router } from 'express';
import { healthRouter } from './modules/health/health.routes.js';

/**
 * Central route registration for /api/v1.
 * When a module from src/modules/module-registry.ts is implemented, mount its
 * router here using the module's `basePath` and flip its status to 'implemented'.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
