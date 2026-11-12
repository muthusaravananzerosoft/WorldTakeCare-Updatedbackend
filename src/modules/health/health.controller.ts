import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/responses/api-response.js';
import { healthService } from './health.service.js';

export const healthController = {
  getHealth(req: Request, res: Response) {
    sendSuccess(req, res, healthService.getHealth());
  },
};
