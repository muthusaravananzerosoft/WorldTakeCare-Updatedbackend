import type { Request, Response } from 'express';
import { sendSuccess } from '../common/responses/api-response.js';
import { healthService } from '../services/health.service.js';

export const healthController = {
  async getHealth(req: Request, res: Response) {
    sendSuccess(req, res, await healthService.getHealth());
  },
};
