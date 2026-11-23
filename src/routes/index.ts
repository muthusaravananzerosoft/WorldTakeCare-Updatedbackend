import { Router } from 'express';
import { adminFeaturedCountryRouter } from './admin-featured-country.routes.js';
import { authRouter } from './auth.routes.js';
import { connectionRouter } from './connection.routes.js';
<<<<<<< HEAD
=======
import { destinationRouter } from './destination.routes.js';
import { featuredCountryRouter } from './featured-country.routes.js';
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
import { guideProfileRouter } from './guide-profile.routes.js';
import { guideRouter } from './guide.routes.js';
import { healthRouter } from './health.routes.js';
import { postRouter } from './post.routes.js';
<<<<<<< HEAD
=======
import { tripRouter } from './trip.routes.js';
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7

/**
 * Central route registration for /api/v1.
 * Mount implemented feature routers here at their registered base paths.
 */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/destinations', destinationRouter);
apiRouter.use('/health', healthRouter);
<<<<<<< HEAD
=======
apiRouter.use('/trips', tripRouter);
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
apiRouter.use('/posts', postRouter);
apiRouter.use('/connections', connectionRouter);
// Public routes mount first — guideProfileRouter applies auth at router level
// and would 401 public paths. /me/* still reaches it (/:id can't match 2+ segments).
apiRouter.use('/guides', guideRouter);
apiRouter.use('/guides', guideProfileRouter);
<<<<<<< HEAD
=======
apiRouter.use('/featured-countries', featuredCountryRouter);
apiRouter.use('/admin/featured-countries', adminFeaturedCountryRouter);
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
