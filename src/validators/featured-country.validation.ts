import { z } from 'zod';

const httpsUrl = z.string().trim().url().max(500).optional();

const featuredCountryBody = {
  countryName: z.string().trim().min(1).max(120),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Expected a 2-letter ISO country code')
    .toUpperCase(),
  description: z.string().trim().min(1).max(300),
  /** Exactly 3 travel keywords, per the card design. */
  keywords: z
    .array(z.string().trim().min(1).max(30))
    .length(3, 'Exactly 3 keywords are required'),
  landmarkName: z.string().trim().min(1).max(160),
  imageUrl: httpsUrl,
  imageProvider: z.string().trim().min(1).max(30).optional(),
  imageId: z.string().trim().min(1).max(64).optional(),
  photographerName: z.string().trim().min(1).max(120).optional(),
  photographerUrl: httpsUrl,
  imageSourceUrl: httpsUrl,
  displayOrder: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
};

/** POST /admin/featured-countries */
export const createFeaturedCountryBodySchema = z.object(featuredCountryBody);

/** PATCH /admin/featured-countries/:id — partial. */
export const updateFeaturedCountryBodySchema = z.object({
  ...featuredCountryBody,
  countryName: featuredCountryBody.countryName.optional(),
  countryCode: featuredCountryBody.countryCode.optional(),
  description: featuredCountryBody.description.optional(),
  keywords: featuredCountryBody.keywords.optional(),
  landmarkName: featuredCountryBody.landmarkName.optional(),
  displayOrder: featuredCountryBody.displayOrder.optional(),
  isActive: featuredCountryBody.isActive.optional(),
});

export const featuredCountryIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Country id must be a positive integer'),
});

export const featuredCountryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().min(1).max(80).optional(),
});

export type FeaturedCountryQuery = z.infer<typeof featuredCountryQuerySchema>;
