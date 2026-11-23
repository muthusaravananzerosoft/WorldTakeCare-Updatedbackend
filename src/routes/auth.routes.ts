import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  changePasswordSchema,
  emailOnlySchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  tokenQuerySchema,
} from '../validators/auth.validation.js';

/**
 * Auth endpoints. A strict limiter guards every credential/costly route —
 * brute force and mail abuse are the main threats (the legacy app had no
 * throttling at all).
 */
const strict = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

export const authRouter = Router();

authRouter.get('/', authController.info);

authRouter.post(
  '/register',
  strict,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);
authRouter.get(
  '/activate',
  validate({ query: tokenQuerySchema }),
  asyncHandler(authController.activate),
);
authRouter.post(
  '/resend-activation',
  strict,
  validate({ body: emailOnlySchema }),
  asyncHandler(authController.resendActivation),
);
authRouter.post(
  '/login',
  strict,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);
authRouter.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  asyncHandler(authController.refresh),
);
authRouter.post(
  '/logout',
  validate({ body: refreshTokenSchema }),
  asyncHandler(authController.logout),
);
authRouter.post(
  '/forgot-password',
  strict,
  validate({ body: emailOnlySchema }),
  asyncHandler(authController.forgotPassword),
);
authRouter.post(
  '/reset-password',
  strict,
  validate({ body: resetPasswordSchema }),
  asyncHandler(authController.resetPassword),
);
authRouter.post(
  '/change-password',
  strict,
  requireAuth,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
