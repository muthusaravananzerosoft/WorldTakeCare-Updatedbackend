import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { sendSuccess } from '../common/responses/api-response.js';
import type { CreateTripInput, UpdateTripInput } from '../entities/trip.types.js';
import { tripService } from '../services/trip.service.js';

const body = <T>(res: Response) => res.locals.validated.body as T;
const params = <T>(res: Response) => res.locals.validated.params as T;

export const tripController = {
  async create(req: Request, res: Response) {
    const result = await tripService.create(req.user!.id, body<CreateTripInput>(res));
    sendSuccess(req, res, result, HTTP_STATUS.CREATED);
  },

  async list(req: Request, res: Response) {
    sendSuccess(req, res, { trips: await tripService.list(req.user!.id) });
  },

  async getById(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await tripService.getById(id, req.user!.id));
  },

  async update(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await tripService.update(id, req.user!.id, body<UpdateTripInput>(res)));
  },

  async remove(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    await tripService.delete(id, req.user!.id);
    sendSuccess(req, res, { deleted: true });
  },
};
