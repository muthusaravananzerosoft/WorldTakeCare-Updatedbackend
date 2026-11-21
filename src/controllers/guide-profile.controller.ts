import type { Request, Response } from 'express';
import { sendSuccess } from '../common/responses/api-response.js';
import type { GuideProfilePatchInput } from '../entities/guide-profile.types.js';
import { guideProfileService } from '../services/guide-profile.service.js';

const body = <T>(res: Response) => res.locals.validated.body as T;

export const guideProfileController = {
  async get(req: Request, res: Response) {
    sendSuccess(req, res, await guideProfileService.get(req.user!.id));
  },

  async update(req: Request, res: Response) {
    sendSuccess(
      req,
      res,
      await guideProfileService.update(req.user!.id, body<GuideProfilePatchInput>(res)),
    );
  },

  async uploadCover(req: Request, res: Response) {
    sendSuccess(req, res, await guideProfileService.uploadCover(req.user!.id, req.file));
  },

  async deleteCover(req: Request, res: Response) {
    sendSuccess(req, res, await guideProfileService.deleteCover(req.user!.id));
  },

  async uploadProfileImage(req: Request, res: Response) {
    sendSuccess(req, res, await guideProfileService.uploadProfileImage(req.user!.id, req.file));
  },

  async deleteProfileImage(req: Request, res: Response) {
    sendSuccess(req, res, await guideProfileService.deleteProfileImage(req.user!.id));
  },
};
