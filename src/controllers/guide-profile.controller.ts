import type { Request, Response } from 'express';
import { sendSuccess } from '../common/responses/api-response.js';
import type { GuideListFilters, GuideProfilePatchInput } from '../entities/guide-profile.types.js';
import { guideProfileService } from '../services/guide-profile.service.js';

const body = <T>(res: Response) => res.locals.validated.body as T;
const params = <T>(res: Response) => res.locals.validated.params as T;
const query = <T>(res: Response) => res.locals.validated.query as T;

interface ListQuery extends GuideListFilters {
  page: number;
  limit: number;
}

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

  async publish(req: Request, res: Response) {
    sendSuccess(req, res, await guideProfileService.publish(req.user!.id));
  },

  async listPublic(req: Request, res: Response) {
    const q = query<ListQuery>(res);
    const result = await guideProfileService.listPublic(
      {
        q: q.q,
        language: q.language,
        specialty: q.specialty,
        maxHourlyRate: q.maxHourlyRate,
        currency: q.currency,
        sort: q.sort,
      },
      { page: q.page, pageSize: q.limit },
    );
    sendSuccess(req, res, result);
  },

  async getPublicById(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await guideProfileService.getPublicById(id));
  },
};
