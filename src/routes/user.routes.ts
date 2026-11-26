import { Router, type NextFunction, type Request, type Response } from 'express';
import { AppError } from '../common/errors/app-error.js';
import { asyncHandler } from '../common/utils/async-handler.js';
import { profileController } from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { createUpload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  newestMembersQuerySchema,
  updateProfileSchema,
} from '../validators/profile.validation.js';

/**
 * Member profile — the authenticated member's own profile only. Identity
 * comes from req.user; a user id in the body is never accepted. One PUT
 * saves all account-page sections (personal, locations, visited and
 * visiting countries) plus the profile photo and cover image in a single
 * transaction. JSON bodies update text only; multipart bodies carry the
 * same payload in a `profile` JSON field plus optional `profileImage` /
 * `coverImage` files.
 */
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });
const imageUpload = createUpload({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSizeBytes: 2 * 1024 * 1024,
});

/**
 * Multipart PUTs carry the profile payload as a JSON string in a `profile`
 * form field — decode it into req.body so validation sees the same shape
 * as a JSON request.
 */
function parseMultipartProfile(req: Request, _res: Response, next: NextFunction) {
  if (typeof req.body?.profile === 'string') {
    try {
      req.body = JSON.parse(req.body.profile);
    } catch {
      next(AppError.badRequest('The profile field must be valid JSON'));
      return;
    }
  }
  next();
}

export const userRouter = Router();

// Public — newest members for the homepage list (legacy front_new_members).
userRouter.get(
  '/newest',
  validate({ query: newestMembersQuerySchema }),
  asyncHandler(profileController.newest),
);

userRouter.use(requireAuth);

userRouter.get('/me/profile', asyncHandler(profileController.get));

userRouter.put(
  '/me/profile',
  writeLimiter,
  imageUpload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
  ]),
  parseMultipartProfile,
  validate({ body: updateProfileSchema }),
  asyncHandler(profileController.update),
);
