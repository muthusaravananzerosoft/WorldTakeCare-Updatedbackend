import { Router } from 'express';
import { USER_ROLES } from '../common/constants/auth.constants.js';
import { asyncHandler } from '../common/utils/async-handler.js';
import { guideProfileController } from '../controllers/guide-profile.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { createUpload } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { updateGuideProfileBodySchema } from '../validators/guide-profile.validation.js';

/**
 * Guide profile — the authenticated guide's own profile only. The identity
 * comes from req.user (guide role enforced); a guideId in the body is never
 * accepted. verificationStatus/profileStatus stay server-managed.
 */
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });
const coverUpload = createUpload({
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSizeBytes: 2 * 1024 * 1024,
});

export const guideProfileRouter = Router();

guideProfileRouter.use(requireAuth, requireRole(USER_ROLES.GUIDE));

guideProfileRouter.get('/me/profile', asyncHandler(guideProfileController.get));

guideProfileRouter.patch(
  '/me/profile',
  writeLimiter,
  validate({ body: updateGuideProfileBodySchema }),
  asyncHandler(guideProfileController.update),
);

guideProfileRouter.post(
  '/me/profile/cover',
  writeLimiter,
  coverUpload.single('file'),
  asyncHandler(guideProfileController.uploadCover),
);

guideProfileRouter.delete(
  '/me/profile/cover',
  writeLimiter,
  asyncHandler(guideProfileController.deleteCover),
);

guideProfileRouter.post(
  '/me/profile/photo',
  writeLimiter,
  coverUpload.single('file'),
  asyncHandler(guideProfileController.uploadProfileImage),
);

guideProfileRouter.delete(
  '/me/profile/photo',
  writeLimiter,
  asyncHandler(guideProfileController.deleteProfileImage),
);
