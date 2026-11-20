import { Router } from 'express';
import { asyncHandler } from '../common/utils/async-handler.js';
import { postController } from '../controllers/post.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  commentBodySchema,
  commentIdParamSchema,
  createPostBodySchema,
  paginationQuerySchema,
  postIdParamSchema,
  updatePostBodySchema,
} from '../validators/post.validation.js';

/**
 * Travel posts + comments. Reads are public (the travel feed); creating,
 * editing and deleting require a Bearer token. Owner-or-admin rules are
 * enforced in the service.
 */
const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

export const postRouter = Router();

postRouter.get('/', validate({ query: paginationQuerySchema }), asyncHandler(postController.list));

postRouter.post(
  '/',
  writeLimiter,
  requireAuth,
  validate({ body: createPostBodySchema }),
  asyncHandler(postController.create),
);

postRouter.get(
  '/:id',
  validate({ params: postIdParamSchema }),
  asyncHandler(postController.getById),
);

postRouter.patch(
  '/:id',
  writeLimiter,
  requireAuth,
  validate({ params: postIdParamSchema, body: updatePostBodySchema }),
  asyncHandler(postController.update),
);

postRouter.delete(
  '/:id',
  writeLimiter,
  requireAuth,
  validate({ params: postIdParamSchema }),
  asyncHandler(postController.remove),
);

postRouter.get(
  '/:id/comments',
  validate({ params: postIdParamSchema, query: paginationQuerySchema }),
  asyncHandler(postController.listComments),
);

postRouter.post(
  '/:id/comments',
  writeLimiter,
  requireAuth,
  validate({ params: postIdParamSchema, body: commentBodySchema }),
  asyncHandler(postController.addComment),
);

postRouter.patch(
  '/:id/comments/:commentId',
  writeLimiter,
  requireAuth,
  validate({ params: commentIdParamSchema, body: commentBodySchema }),
  asyncHandler(postController.updateComment),
);

postRouter.delete(
  '/:id/comments/:commentId',
  writeLimiter,
  requireAuth,
  validate({ params: commentIdParamSchema }),
  asyncHandler(postController.deleteComment),
);
