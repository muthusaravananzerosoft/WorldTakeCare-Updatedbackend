import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Invalid date');

const postFields = {
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(20000),
  imageUrl: z.string().trim().url().max(500).optional(),
  publishedDate: isoDate,
};

/** POST /posts */
export const createPostBodySchema = z.object(postFields);

/** PATCH /posts/:id — every field optional. */
export const updatePostBodySchema = z
  .object({
    title: postFields.title.optional(),
    description: postFields.description.optional(),
    imageUrl: postFields.imageUrl.nullable(),
    publishedDate: postFields.publishedDate.optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field is required',
  });

export const postIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Post id must be a positive integer'),
});

export const commentIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Post id must be a positive integer'),
  commentId: z.coerce.number().int().positive('Comment id must be a positive integer'),
});

/** POST /posts/:id/comments and PATCH /posts/:id/comments/:commentId */
export const commentBodySchema = z.object({
  comment: z.string().trim().min(1).max(2000),
});

/** GET /posts?page=&limit= and GET /posts/:id/comments?page=&limit= */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreatePostBody = z.infer<typeof createPostBodySchema>;
export type UpdatePostBody = z.infer<typeof updatePostBodySchema>;
export type CommentBody = z.infer<typeof commentBodySchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
