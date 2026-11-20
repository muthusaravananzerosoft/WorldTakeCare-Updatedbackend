import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Invalid date');

const tagList = z
  .array(z.string().trim().min(1).max(60))
  .max(20)
  .transform((arr) => [...new Set(arr.map((s) => s.toLowerCase()))]);

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

const itineraryStopSchema = z.object({
  attractionId: z.number().int().positive('A valid attractionId is required'),
  order: z.number().int().positive('order must be a positive integer'),
  time: hhmm.optional(),
  note: z.string().trim().max(500).optional(),
});

/** Day-range and attraction-existence checks happen in the service (they need the trip dates). */
const itinerarySchema = z
  .array(
    z.object({
      day: z.number().int().min(1, 'day must be 1 or greater'),
      stops: z.array(itineraryStopSchema).max(50).default([]),
    }),
  )
  .max(60)
  .refine((days) => new Set(days.map((d) => d.day)).size === days.length, {
    message: 'Duplicate day numbers in itinerary',
  });

const tripBody = {
  destinationId: z.number().int().positive('A valid destination is required'),
  startDate: isoDate,
  endDate: isoDate,
  tripType: z.string().trim().min(1).max(40).optional(),
  interests: tagList.default([]),
  notes: z.string().trim().max(2000).optional(),
  accommodation: z.string().trim().min(1).max(60).optional(),
  dietaryPreferences: tagList.default([]),
  emergencyContact: z
    .object({
      name: z.string().trim().min(1).max(120),
      phone: z.string().trim().min(5).max(40),
    })
    .optional(),
  insurance: z
    .object({
      provider: z.string().trim().min(1).max(160),
      insuranceNumber: z.string().trim().min(1).max(80),
    })
    .optional(),
  budget: z
    .object({
      amount: z.number().nonnegative().max(100_000_000),
      currency: z.string().trim().length(3).toUpperCase(),
    })
    .optional(),
  visibility: z.enum(['public', 'private', 'friends']).default('private'),
  planMode: z.enum(['auto', 'manual']).default('auto'),
  itinerary: itinerarySchema.optional(),
};

const endAfterStart = (data: { startDate?: string | undefined; endDate?: string | undefined }) =>
  !data.startDate || !data.endDate || data.endDate >= data.startDate;

/** POST /trips */
export const createTripBodySchema = z
  .object(tripBody)
  .refine(endAfterStart, { message: 'endDate must be on or after startDate', path: ['endDate'] });

/** PATCH /trips/:id — partial; nested objects replace when sent. */
export const updateTripBodySchema = z
  .object({
    ...tripBody,
    destinationId: tripBody.destinationId.optional(),
    startDate: tripBody.startDate.optional(),
    endDate: tripBody.endDate.optional(),
    interests: tagList.optional(),
    dietaryPreferences: tagList.optional(),
    // Raw enums without the create-time defaults — a default would silently
    // overwrite the stored value on every PATCH that omits the field.
    visibility: z.enum(['public', 'private', 'friends']).optional(),
    planMode: z.enum(['auto', 'manual']).optional(),
  })
  .refine(endAfterStart, { message: 'endDate must be on or after startDate', path: ['endDate'] });

export const tripIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Trip id must be a positive integer'),
});

export type CreateTripBody = z.infer<typeof createTripBodySchema>;
export type UpdateTripBody = z.infer<typeof updateTripBodySchema>;
