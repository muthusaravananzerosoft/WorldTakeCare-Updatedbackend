import { z } from 'zod';
import { REGISTRABLE_ROLES } from '../common/constants/auth.constants.js';

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Must be at least 2 characters')
  .max(30, 'Must be at most 30 characters');

const emailSchema = z.email('Must be a valid email address').toLowerCase();

/** 8–72 chars, at least one letter and one digit. */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

/** ISO date that must place the member at 18 or older (legacy checked this client-side only). */
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

export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    confirmEmail: emailSchema,
    password: passwordSchema,
    sex: z.enum(['male', 'female']),
    dob: dobSchema,
    countryCode: z
      .string()
      .trim()
      .length(2, 'Country code must be 2 letters')
      .transform((value) => value.toUpperCase()),
    role: z.enum(REGISTRABLE_ROLES).default('user'),
    captchaToken: z.string().optional(),
  })
  .refine((data) => data.email === data.confirmEmail, {
    message: 'Email addresses do not match',
    path: ['confirmEmail'],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const emailOnlySchema = z.object({ email: emailSchema });

export const tokenQuerySchema = z.object({
  token: z.string().min(32, 'Invalid token'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(32, 'Invalid refresh token'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Invalid token'),
  password: passwordSchema,
});
