import { z } from 'zod';

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
