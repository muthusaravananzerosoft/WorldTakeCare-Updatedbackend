import { Router } from 'express';
import { healthRouter } from './health.routes.js';

/**
 * Central route registration for /api/v1.
 * Mount implemented feature routers here at their registered base paths.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
