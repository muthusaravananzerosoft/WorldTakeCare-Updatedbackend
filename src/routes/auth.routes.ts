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
  oauthCallbackBodySchema,
  oauthCallbackQuerySchema,
  oauthProviderParamsSchema,
  oauthStartQuerySchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  socialLoginSchema,
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
  '/social',
  strict,
  validate({ body: socialLoginSchema }),
  asyncHandler(authController.socialLogin),
);
// Server-side OAuth (Microsoft / Apple / X). start sets a signed state cookie
// and 302s to the provider; the callback is a browser redirect, so GET has no
// strict limiter — the provider may retry it. Apple POSTs via form_post.
authRouter.get(
  '/oauth/:provider/start',
  strict,
  validate({ params: oauthProviderParamsSchema, query: oauthStartQuerySchema }),
  asyncHandler(authController.oauthStart),
);
authRouter.get(
  '/oauth/:provider/callback',
  validate({ params: oauthProviderParamsSchema, query: oauthCallbackQuerySchema }),
  asyncHandler(authController.oauthCallback),
);
authRouter.post(
  '/oauth/:provider/callback',
  validate({ params: oauthProviderParamsSchema, body: oauthCallbackBodySchema }),
  asyncHandler(authController.oauthCallback),
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
