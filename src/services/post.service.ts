import { USER_ROLES, type UserRole } from '../common/constants/auth.constants.js';
import { AppError } from '../common/errors/app-error.js';
import type {
  CommentRecord,
  CommentResult,
  CreatePostInput,
  PostRecord,
  PostResult,
  UpdatePostInput,
} from '../entities/post.types.js';
import type { Page, PageRequest } from '../repositories/repository.interface.js';
import {
  commentRepository,
  postRepository,
  type CommentRepository,
  type PostRepository,
} from '../repositories/post.repository.js';

export interface PostServiceDeps {
  posts: PostRepository;
  comments: CommentRepository;
}

/** Average adult reading speed used for the auto reading-time estimate. */
const WORDS_PER_MINUTE = 200;

function readingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function toPostResult(r: PostRecord): PostResult {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    readingTimeMin: r.readingTimeMin,
    publishedDate: r.publishedDate,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: { id: r.userId, firstName: r.authorFirstName, lastName: r.authorLastName },
    commentCount: r.commentCount,
  };
}

function toCommentResult(r: CommentRecord): CommentResult {
  return {
    id: r.id,
    postId: r.postId,
    comment: r.comment,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    author: { id: r.userId, firstName: r.authorFirstName, lastName: r.authorLastName },
  };
}

function page<TIn, TOut>(p: Page<TIn>, map: (x: TIn) => TOut, key: string) {
  return {
    [key]: p.items.map(map),
    page: p.page,
    limit: p.pageSize,
    total: p.totalItems,
    totalPages: Math.ceil(p.totalItems / p.pageSize),
  };
}

export function createPostService(deps: PostServiceDeps) {
  const { posts, comments } = deps;

  const canModify = (ownerId: number, requester: { id: number; role: UserRole }) =>
    requester.id === ownerId || requester.role === USER_ROLES.ADMIN;

  async function requirePost(id: number): Promise<PostRecord> {
    const post = await posts.findById(id);
    if (!post) throw AppError.notFound('Post not found');
    return post;
  }

  async function requireOwnedPost(id: number, requester: { id: number; role: UserRole }) {
    const post = await requirePost(id);
    if (!canModify(post.userId, requester)) throw AppError.notFound('Post not found');
    return post;
  }

  return {
    async create(userId: number, input: CreatePostInput): Promise<PostResult> {
      const record = await posts.create(userId, input, readingTimeMinutes(input.description));
      return toPostResult(record);
    },

    async list(request: PageRequest) {
      return page(await posts.findPage(request), toPostResult, 'posts');
    },

    async getById(id: number): Promise<PostResult> {
      return toPostResult(await requirePost(id));
    },

    async update(id: number, requester: { id: number; role: UserRole }, input: UpdatePostInput) {
      await requireOwnedPost(id, requester);
      const updated = await posts.update(
        id,
        input,
        input.description !== undefined ? readingTimeMinutes(input.description) : undefined,
      );
      if (!updated) throw AppError.notFound('Post not found');
      return toPostResult(updated);
    },

    async delete(id: number, requester: { id: number; role: UserRole }): Promise<void> {
      await requireOwnedPost(id, requester);
      await posts.delete(id);
    },

    async addComment(postId: number, userId: number, comment: string): Promise<CommentResult> {
      await requirePost(postId);
      return toCommentResult(await comments.create(postId, userId, comment));
    },

    async listComments(postId: number, request: PageRequest) {
      await requirePost(postId);
      return page(await comments.findPageByPost(postId, request), toCommentResult, 'comments');
    },

    async updateComment(
      postId: number,
      commentId: number,
      requester: { id: number; role: UserRole },
      comment: string,
    ): Promise<CommentResult> {
      await requirePost(postId);
      const existing = await comments.findById(commentId);
      if (!existing || existing.postId !== postId) throw AppError.notFound('Comment not found');
      if (!canModify(existing.userId, requester)) throw AppError.notFound('Comment not found');
      const updated = await comments.update(commentId, comment);
      if (!updated) throw AppError.notFound('Comment not found');
      return toCommentResult(updated);
    },

    async deleteComment(
      postId: number,
      commentId: number,
      requester: { id: number; role: UserRole },
    ): Promise<void> {
      const existing = await comments.findById(commentId);
      if (!existing || existing.postId !== postId) throw AppError.notFound('Comment not found');
      if (!canModify(existing.userId, requester)) throw AppError.notFound('Comment not found');
      await comments.delete(commentId);
    },
  };
}

export type PostService = ReturnType<typeof createPostService>;

export const postService = createPostService({
  posts: postRepository,
  comments: commentRepository,
});
