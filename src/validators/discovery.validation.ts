import { z } from 'zod';
import { MEMBER_DISCOVERY_SORTS } from '../entities/profile.types.js';

export const memberDiscoveryQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(80).optional(),
    ageMin: z.coerce.number().int().min(18).max(99).optional(),
    ageMax: z.coerce.number().int().min(18).max(99).optional(),
    gender: z.enum(['male', 'female']).optional(),
    countryCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2}$/, 'Expected a 2-letter country code')
      .toUpperCase()
      .optional(),
    stateId: z.coerce.number().int().positive().optional(),
    city: z.string().trim().min(1).max(120).optional(),
    language: z.string().trim().min(1).max(60).optional(),
    lookingToMeet: z.enum(['man', 'woman', 'man_or_woman', 'other']).optional(),
    maritalStatus: z
      .enum([
        'available',
        'seeing_someone',
        'complicated',
        'single',
        'married',
        'separated',
        'divorced',
        'widowed',
      ])
      .optional(),
    raceId: z.coerce.number().int().positive().optional(),
    religionId: z.coerce.number().int().min(1).max(7).optional(),
    // Preset value (non_smoker…) or any custom trait label — matched as a
    // whole CSV token in user.other.
    trait: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .refine((t) => !t.includes(','), { message: 'Trait must not contain commas' })
      .optional(),
    sort: z.enum(MEMBER_DISCOVERY_SORTS).default('recommended'),
    page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(15),
  })
  .refine(
    (value) =>
      value.ageMin === undefined || value.ageMax === undefined || value.ageMin <= value.ageMax,
    {
      message: 'ageMin must be less than or equal to ageMax',
      path: ['ageMin'],
    },
  );
