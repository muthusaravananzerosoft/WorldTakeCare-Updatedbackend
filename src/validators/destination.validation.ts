import { z } from 'zod';

/** GET /destinations/search?q=&limit=&kind= */
export const destinationSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Search query must be at least 2 characters')
    .max(80, 'Search query must be at most 80 characters'),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  kind: z.enum(['country', 'state', 'city', 'place']).optional(),
});

/** GET /destinations/:id */
export const destinationIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Destination id must be a positive integer'),
});

/** GET /destinations/:id/attractions?limit=&radiusKm= */
export const attractionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  // 25km default covers famous spots just outside the city centre
  // (e.g. Azhagar Kovil ~20km from Madurai); >12km entries flag dayTrip.
  radiusKm: z.coerce.number().min(1).max(50).default(25),
});

export type DestinationSearchQuery = z.infer<typeof destinationSearchQuerySchema>;
export type DestinationIdParam = z.infer<typeof destinationIdParamSchema>;
export type AttractionsQuery = z.infer<typeof attractionsQuerySchema>;
