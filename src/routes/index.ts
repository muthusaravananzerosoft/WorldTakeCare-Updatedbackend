import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { connectionRouter } from './connection.routes.js';
import { guideProfileRouter } from './guide-profile.routes.js';
import { guideRouter } from './guide.routes.js';
import { healthRouter } from './health.routes.js';
import { postRouter } from './post.routes.js';
import { referenceRouter } from './reference.routes.js';
import { userRouter } from './user.routes.js';

/**
 * Central route registration for /api/v1.
 * Mount implemented feature routers here at their registered base paths.
 */
export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/posts', postRouter);
apiRouter.use('/connections', connectionRouter);
// Public routes mount first — guideProfileRouter applies auth at router level
// and would 401 public paths. /me/* still reaches it (/:id can't match 2+ segments).
apiRouter.use('/guides', guideRouter);
apiRouter.use('/guides', guideProfileRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/reference', referenceRouter);
