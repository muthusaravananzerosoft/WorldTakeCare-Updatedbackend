import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { sendSuccess } from '../common/responses/api-response.js';
import type {
  FeaturedCountryInput,
  FeaturedCountryUpdateInput,
} from '../entities/featured-country.types.js';
import { featuredCountryService } from '../services/featured-country.service.js';
import type { FeaturedCountryQuery } from '../validators/featured-country.validation.js';

const body = <T>(res: Response) => res.locals.validated.body as T;
const params = <T>(res: Response) => res.locals.validated.params as T;
const query = <T>(res: Response) => res.locals.validated.query as T;

export const featuredCountryController = {
  async list(req: Request, res: Response) {
    const { page, limit, q } = query<FeaturedCountryQuery>(res);
    sendSuccess(req, res, await featuredCountryService.list({ page, pageSize: limit }, q));
  },

  async getById(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await featuredCountryService.getById(id));
  },

  async create(req: Request, res: Response) {
    const result = await featuredCountryService.create(body<FeaturedCountryInput>(res));
    sendSuccess(req, res, result, HTTP_STATUS.CREATED);
  },

  async update(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(
      req,
      res,
      await featuredCountryService.update(id, body<FeaturedCountryUpdateInput>(res)),
    );
  },

  async remove(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    await featuredCountryService.delete(id);
    sendSuccess(req, res, { deleted: true });
  },
};
