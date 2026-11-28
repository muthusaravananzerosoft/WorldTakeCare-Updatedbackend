import { z } from 'zod';
import {
  MARITAL_STATUS_OPTIONS,
  MAX_NATIONALITIES,
  MAX_TRAIT_CSV_LENGTH,
  MAX_TRAIT_LENGTH,
  MAX_TRAITS,
  MAX_VISITING_COUNTRIES,
  RELIGION_OTHER_ID,
} from '../common/constants/profile.constants.js';

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Must be at least 2 characters')
  .max(30, 'Must be at most 30 characters');

/** ISO date that must place the member at 18 or older (same rule as registration). */
const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Date of birth must be a real date')
  .refine((value) => {
    const birth = new Date(value);
    const now = new Date();
    const age =
      now.getFullYear() -
      birth.getFullYear() -
      (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    return age >= 18;
  }, 'You must be at least 18 years old');

const countryCodeSchema = z
  .string()
  .trim()
  .length(2, 'Country code must be 2 letters')
  .transform((value) => value.toUpperCase());

const locationSchema = z.object({
  countryCode: countryCodeSchema.nullish(),
  stateId: z.number().int().positive().nullish(),
  city: z.string().trim().max(500).nullish(),
  zip: z.string().trim().max(10).nullish(),
  timezone: z.string().trim().max(50).nullish(),
});

const maritalValues = MARITAL_STATUS_OPTIONS.map((o) => o.value) as [string, ...string[]];

/**
 * One trait label — preset value (non_smoker…) or any custom text.
 * `user.other` is a CSV column, so commas would corrupt the encoding and
 * a numeric-only label would be misread as a legacy preset id.
 */
const traitSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_TRAIT_LENGTH)
  .refine((t) => !t.includes(','), { message: 'Trait must not contain commas' })
  .refine((t) => !/^\d+$/.test(t), { message: 'Trait must not be a number' });

const personalSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    sex: z.enum(['male', 'female']).nullish(),
    dob: dobSchema.nullish(),
    countryOfBirth: countryCodeSchema.nullish(),
    raceId: z.number().int().positive().nullish(),
    religionId: z.number().int().min(1).max(7).nullish(),
    otherReligion: z.string().trim().max(200).nullish(),
    heightId: z.number().int().positive().nullish(),
    maritalStatus: z.enum(maritalValues).optional(),
    educationId: z.number().int().positive().nullish(),
    languages: z.string().trim().max(500).nullish(),
    traits: z
      .array(traitSchema)
      .max(MAX_TRAITS, `Select at most ${MAX_TRAITS} traits`)
      // `user.other` is varchar(222) — the whole CSV must fit.
      .refine((list) => list.join(',').length <= MAX_TRAIT_CSV_LENGTH, {
        message: 'Traits are too long combined',
      })
      .optional(),
    nationalities: z.array(countryCodeSchema).max(MAX_NATIONALITIES).optional(),
    lookingToMeet: z.enum(['man', 'woman', 'man_or_woman', 'other']).nullish(),
    lookingToMeetOther: z.string().trim().max(50).nullish(),
    writeSomething: z.string().max(20000).nullish(),
    about: z.string().max(20000).nullish(),
  })
  .refine((data) => data.religionId !== RELIGION_OTHER_ID || !!data.otherReligion?.trim(), {
    message: 'otherReligion is required when religion is Other',
    path: ['otherReligion'],
  })
  .refine((data) => data.lookingToMeet !== 'other' || !!data.lookingToMeetOther?.trim(), {
    message: "lookingToMeetOther is required when lookingToMeet is 'other'",
    path: ['lookingToMeetOther'],
  });

const visitedCountrySchema = z.object({
  countryCode: countryCodeSchema,
  stateIds: z.array(z.number().int().positive()).default([]),
});

/**
 * PUT /users/me/profile — one save covering all legacy account-page
 * sections. `personal` is optional so a multipart PUT can carry only image
 * changes; the other sections are replaced wholesale when present.
 */
export const updateProfileSchema = z.object({
  personal: personalSchema.optional(),
  location: z
    .object({
      primary: locationSchema.optional(),
      secondary: locationSchema.optional(),
    })
    .optional(),
  visitedCountries: z.array(visitedCountrySchema).optional(),
  visitingCountries: z
    .array(countryCodeSchema)
    .max(MAX_VISITING_COUNTRIES, 'Select at most two countries')
    .optional(),
  removeProfileImage: z.boolean().optional(),
  removeCoverImage: z.boolean().optional(),
});

/** GET /users/newest — public homepage list; legacy shows 15. */
export const newestMembersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

/** GET /users/:id — public member detail path param. */
export const memberIdParamSchema = z.object({
  id: z.coerce.number().int().positive('User id must be a positive integer'),
});
