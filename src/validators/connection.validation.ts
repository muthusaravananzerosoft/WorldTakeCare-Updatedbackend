import { z } from 'zod';
import { CONNECTION_STATUSES } from '../entities/connection.types.js';

const id = z.number().int().positive('A valid id is required');

/**
<<<<<<< HEAD
 * Exactly one direction per request:
 *   { guideId }  — member invites a guide
 *   { memberId } — guide invites a member
 */
export const createConnectionBodySchema = z
  .object({
=======
 * Exactly one direction per request; tripId is optional:
 *   { guideId }  / { guideId, tripId }  — member invites a guide
 *   { memberId } / { memberId, tripId } — guide invites a member
 */
export const createConnectionBodySchema = z
  .object({
    tripId: id.optional(),
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
    guideId: id.optional(),
    memberId: id.optional(),
  })
  .refine((b) => (b.guideId === undefined) !== (b.memberId === undefined), {
    message: 'Provide exactly one of guideId or memberId',
  });

export const connectionIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Connection id must be a positive integer'),
});

export const listConnectionsQuerySchema = z.object({
  status: z.enum(CONNECTION_STATUSES).optional(),
  type: z.enum(['sent', 'received', 'all']).default('all'),
<<<<<<< HEAD
=======
  tripId: z.coerce.number().int().positive().optional(),
>>>>>>> 0109527d6de84cac509d4ead8a7bb60c699937f7
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
