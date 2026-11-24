import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../common/utils/async-handler.js';
import { referenceController } from '../controllers/reference.controller.js';
import { validate } from '../middleware/validate.middleware.js';

/** Public read-only lookup lists for forms (countries, states, race, ...). */
export const referenceRouter = Router();

const countryCodeParamSchema = z.object({
  code: z
    .string()
    .trim()
    .length(2, 'Country code must be 2 letters')
    .transform((v) => v.toUpperCase()),
});

referenceRouter.get('/', (_req, res) => {
  res.json({ endpoints: ['GET /options', 'GET /countries/:code/states'] });
});
referenceRouter.get('/options', asyncHandler(referenceController.options));
referenceRouter.get(
  '/countries/:code/states',
  validate({ params: countryCodeParamSchema }),
  asyncHandler(referenceController.states),
);
