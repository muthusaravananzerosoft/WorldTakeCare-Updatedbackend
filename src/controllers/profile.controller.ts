import type { Request, Response } from 'express';
import { sendSuccess } from '../common/responses/api-response.js';
import type { UpdateProfileInput } from '../entities/profile.types.js';
import { profileService } from '../services/profile.service.js';

const body = <T>(res: Response) => res.locals.validated.body as T;
const query = <T>(res: Response) => res.locals.validated.query as T;

export const profileController = {
  async newest(req: Request, res: Response) {
    const { limit } = query<{ limit: number }>(res);
    sendSuccess(req, res, await profileService.newestMembers(limit));
  },

  async get(req: Request, res: Response) {
    sendSuccess(req, res, await profileService.getProfile(req.user!.id));
  },

  async update(req: Request, res: Response) {
    sendSuccess(
      req,
      res,
      await profileService.updateProfile(req.user!.id, body<UpdateProfileInput>(res)),
    );
  },

  async uploadPhoto(req: Request, res: Response) {
    sendSuccess(req, res, await profileService.uploadPhoto(req.user!.id, req.file));
  },

  async deletePhoto(req: Request, res: Response) {
    sendSuccess(req, res, await profileService.deletePhoto(req.user!.id));
  },
};
