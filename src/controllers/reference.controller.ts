import type { Request, Response } from 'express';
import { sendSuccess } from '../common/responses/api-response.js';
import { referenceService } from '../services/reference.service.js';

const params = <T>(res: Response) => res.locals.validated.params as T;

export const referenceController = {
  async options(req: Request, res: Response) {
    sendSuccess(req, res, await referenceService.options());
  },

  async states(req: Request, res: Response) {
    const { code } = params<{ code: string }>(res);
    sendSuccess(req, res, await referenceService.statesByCountry(code));
  },
};
