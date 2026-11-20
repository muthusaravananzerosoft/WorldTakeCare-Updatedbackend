import type { Request, Response } from 'express';
import { sendSuccess } from '../common/responses/api-response.js';
import type {
  AttractionsInput,
  DestinationSearchInput,
} from '../entities/destination.types.js';
import { destinationService } from '../services/destination.service.js';

const query = <T>(res: Response) => res.locals.validated.query as T;
const params = <T>(res: Response) => res.locals.validated.params as T;

export const destinationController = {
  async search(req: Request, res: Response) {
    sendSuccess(req, res, await destinationService.search(query<DestinationSearchInput>(res)));
  },

  async getById(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await destinationService.getById(id));
  },

  async getAttractions(req: Request, res: Response) {
    const { id } = params<{ id: number }>(res);
    sendSuccess(req, res, await destinationService.getAttractions(id, query<AttractionsInput>(res)));
  },

  info(req: Request, res: Response) {
    sendSuccess(req, res, {
      service: 'destinations',
      endpoints: [
        'GET /search?q=&limit=&kind=',
        'GET /:id',
        'GET /:id/attractions?limit=&radiusKm=',
      ],
    });
  },
};
