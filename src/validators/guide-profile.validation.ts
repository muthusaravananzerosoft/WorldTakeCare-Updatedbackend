import { z } from 'zod';
import { GUIDE_SORTS } from '../entities/guide-profile.types.js';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

/** Trim, drop empties, case-insensitive dedupe. */
const stringList = (max: number, message: string) =>
  z
    .array(trimmed(1, 60))
    .max(max, message)
    .transform((arr) => {
      const seen = new Set<string>();
      return arr.filter((s) => {
        const key = s.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });

const tourPreferencesSchema = z.strictObject({
  privateTours: z.boolean().optional(),
  groupTours: z.boolean().optional(),
  typicalDuration: trimmed(1, 60).optional(),
  maxGroupSize: z.number().int().positive().max(200).optional(),
});

const hourlyRateSchema = z.strictObject({
  amount: z.number().min(0).max(100_000_000),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/, 'Expected a 3-letter ISO currency code').toUpperCase(),
});

/**
 * PATCH /guides/me/profile — every field optional; presence semantics:
 * absent = keep, null = clear, [] = clear array. strictObject rejects
 * restricted fields like verificationStatus, profileStatus, userId.
 */
export const updateGuideProfileBodySchema = z.strictObject({
  firstName: trimmed(1, 60).optional(),
  lastName: trimmed(1, 60).optional(),
  headline: trimmed(1, 160).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  baseCity: trimmed(1, 120).nullable().optional(),
  countryCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Expected a 2-letter ISO country code')
    .toUpperCase()
    .nullable()
    .optional(),
  guidingAreas: stringList(50, 'Select no more than 50 guiding areas').nullable().optional(),
  languages: stringList(20, 'Select no more than 20 languages').nullable().optional(),
  yearsOfExperience: z.number().int().min(0).max(80).nullable().optional(),
  specialties: stringList(50, 'Select no more than 50 specialties').nullable().optional(),
  certificationTitle: trimmed(1, 160).nullable().optional(),
  tourPreferences: tourPreferencesSchema.nullable().optional(),
  hourlyRate: hourlyRateSchema.nullable().optional(),
  contactPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s\-().]{4,24}$/, 'Invalid phone number')
    .nullable()
    .optional(),
  website: z.url().max(500).nullable().optional(),
});

const currencyCode = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Expected a 3-letter ISO currency code')
  .toUpperCase();

/**
 * GET /guides — public listing. Price filtering/sorting requires a currency
 * so amounts in different currencies are never compared.
 */
export const listGuidesQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(80).optional(),
    language: trimmed(1, 60).optional(),
    specialty: trimmed(1, 60).optional(),
    maxHourlyRate: z.coerce.number().min(0).optional(),
    currency: currencyCode.optional(),
    sort: z.enum(GUIDE_SORTS).default('recommended'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(12),
  })
  .refine((v) => !(v.maxHourlyRate !== undefined && v.currency === undefined), {
    message: 'currency is required when filtering by maxHourlyRate',
  })
  .refine((v) => !(v.sort === 'price_asc' && v.currency === undefined), {
    message: 'currency is required for price_asc sorting',
  });

export const guideIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Guide id must be a positive integer'),
});
