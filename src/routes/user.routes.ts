import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { profileController } from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { createUpload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { updateProfileSchema } from '../validators/profile.validation.js';

/**
 * Member profile — the authenticated member's own profile only. Identity
 * comes from req.user; a user id in the body is never accepted. One PUT
 * saves all account-page sections (personal, locations, visited and
 * visiting countries) in a single transaction.
 */
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });
const photoUpload = createUpload({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSizeBytes: 2 * 1024 * 1024,
});

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/me/profile', asyncHandler(profileController.get));

userRouter.put(
  '/me/profile',
  writeLimiter,
  validate({ body: updateProfileSchema }),
  asyncHandler(profileController.update),
);

// Member profile photo — upload (or replace) and remove, user.profile_img.
userRouter.post(
  '/me/profile/photo',
  writeLimiter,
  photoUpload.single('file'),
  asyncHandler(profileController.uploadPhoto),
);

userRouter.delete(
  '/me/profile/photo',
  writeLimiter,
  asyncHandler(profileController.deletePhoto),
);
