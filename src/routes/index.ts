import { Router } from 'express';
import { adminFeaturedCountryRouter } from './admin-featured-country.routes.js';
import { authRouter } from './auth.routes.js';
import { connectionRouter } from './connection.routes.js';
import { destinationRouter } from './destination.routes.js';
import { featuredCountryRouter } from './featured-country.routes.js';
import { guideProfileRouter } from './guide-profile.routes.js';
import { healthRouter } from './health.routes.js';
import { postRouter } from './post.routes.js';
import { tripRouter } from './trip.routes.js';

/**
 * Central route registration for /api/v1.
 * Mount implemented feature routers here at their registered base paths.
 */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/destinations', destinationRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/trips', tripRouter);
apiRouter.use('/posts', postRouter);
apiRouter.use('/connections', connectionRouter);
apiRouter.use('/guides', guideProfileRouter);
apiRouter.use('/featured-countries', featuredCountryRouter);
apiRouter.use('/admin/featured-countries', adminFeaturedCountryRouter);
