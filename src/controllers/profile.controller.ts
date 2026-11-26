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
    const uploaded = req.files as
      | { profileImage?: Express.Multer.File[]; coverImage?: Express.Multer.File[] }
      | undefined;
    sendSuccess(
      req,
      res,
      await profileService.updateProfile(req.user!.id, body<UpdateProfileInput>(res), {
        profileImage: uploaded?.profileImage?.[0],
        coverImage: uploaded?.coverImage?.[0],
      }),
    );
  },
};
