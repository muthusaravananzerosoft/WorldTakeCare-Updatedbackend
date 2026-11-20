import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { sendSuccess } from '../common/responses/api-response.js';
import type { CreatePostInput, UpdatePostInput } from '../entities/post.types.js';
import { postService } from '../services/post.service.js';
import type { PaginationQuery } from '../validators/post.validation.js';

const body = <T>(res: Response) => res.locals.validated.body as T;
const params = <T>(res: Response) => res.locals.validated.params as T;
const query = <T>(res: Response) => res.locals.validated.query as T;
const page = (res: Response) => {
  const { page, limit } = query<PaginationQuery>(res);
  return { page, pageSize: limit };
};

export const postController = {
  async create(req: Request, res: Response) {
    const result = await postService.create(req.user!.id, body<CreatePostInput>(res));
    sendSuccess(req, res, result, HTTP_STATUS.CREATED);
  },

  async list(req: Request, res: Response) {
    sendSuccess(req, res, await postService.list(page(res)));
  },

  async getById(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await postService.getById(id));
  },

  async update(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await postService.update(id, req.user!, body<UpdatePostInput>(res)));
  },

  async remove(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    await postService.delete(id, req.user!);
    sendSuccess(req, res, { deleted: true });
  },

  async addComment(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    const { comment } = body<{ comment: string }>(res);
    const result = await postService.addComment(id, req.user!.id, comment);
    sendSuccess(req, res, result, HTTP_STATUS.CREATED);
  },

  async listComments(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await postService.listComments(id, page(res)));
  },

  async updateComment(req: Request, res: Response) {
    const { id, commentId } = params<{ id: number; commentId: number }>(res);
    const { comment } = body<{ comment: string }>(res);
    sendSuccess(req, res, await postService.updateComment(id, commentId, req.user!, comment));
  },

  async deleteComment(req: Request, res: Response) {
    const { id, commentId } = params<{ id: number; commentId: number }>(res);
    await postService.deleteComment(id, commentId, req.user!);
    sendSuccess(req, res, { deleted: true });
  },
};
