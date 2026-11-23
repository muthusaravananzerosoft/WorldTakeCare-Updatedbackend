import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { sendSuccess } from '../common/responses/api-response.js';
import type {
  ConnectionListFilters,
  CreateConnectionInput,
} from '../entities/connection.types.js';
import { connectionService } from '../services/connection.service.js';

const body = <T>(res: Response) => res.locals.validated.body as T;
const params = <T>(res: Response) => res.locals.validated.params as T;
const query = <T>(res: Response) => res.locals.validated.query as T;

interface ListQuery extends ConnectionListFilters {
  page: number;
  limit: number;
}

export const connectionController = {
  async create(req: Request, res: Response) {
    const result = await connectionService.create(req.user!, body<CreateConnectionInput>(res));
    sendSuccess(req, res, result, HTTP_STATUS.CREATED);
  },

  async list(req: Request, res: Response) {
    const q = query<ListQuery>(res);
    const result = await connectionService.list(
      req.user!.id,
      { status: q.status, type: q.type },
      { page: q.page, pageSize: q.limit },
    );
    sendSuccess(req, res, result);
  },

  async getById(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await connectionService.getById(id, req.user!.id));
  },

  async accept(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await connectionService.respond(id, req.user!.id, 'accept'));
  },

  async decline(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await connectionService.respond(id, req.user!.id, 'decline'));
  },
};
