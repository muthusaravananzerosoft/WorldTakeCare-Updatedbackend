import type { Request, Response } from 'express';
import { sendSuccess } from '../common/responses/api-response.js';
import type { MemberDiscoveryFilters } from '../entities/profile.types.js';
import { profileService } from '../services/profile.service.js';

const query = <T>(res: Response) => res.locals.validated.query as T;

interface MemberDiscoveryQuery extends MemberDiscoveryFilters {
  page: number;
  limit: number;
}

export const discoveryController = {
  async listMembers(req: Request, res: Response) {
    const { page, limit, ...filters } = query<MemberDiscoveryQuery>(res);
    sendSuccess(req, res, await profileService.discoverMembers(filters, page, limit));
  },
};
