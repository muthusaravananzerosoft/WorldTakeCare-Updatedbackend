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
    role: z.enum(REGISTRABLE_ROLES).default('member'),
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

/**
 * POST /auth/social — provider-issued id token + the role chosen in the
 * signup popup. Browser-native providers only (Google); redirect-flow
 * providers (Microsoft, Apple, X) use the /oauth/:provider/* endpoints below.
 */
export const socialLoginSchema = z.object({
  provider: z.literal('google'),
  idToken: z.string().min(1, 'idToken is required'),
  role: z.enum(REGISTRABLE_ROLES).default('member'),
});

/** GET /auth/oauth/:provider/* — the three redirect-flow providers. */
export const oauthProviderParamsSchema = z.object({
  provider: z.enum(['microsoft', 'apple', 'twitter']),
});

export const oauthStartQuerySchema = z.object({
  role: z.enum(REGISTRABLE_ROLES).default('member'),
});

/**
 * Provider callbacks — code/state arrive in the query (Microsoft, X) or in a
 * form POST body (Apple's response_mode=form_post). Presence is enforced in
 * the service, not the schema, so provider error redirects (?error=...) reach
 * the handler instead of dying in validation.
 */
export const oauthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const oauthCallbackBodySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  /** Apple only: JSON blob with the user's name, sent on first consent. */
  user: z.string().optional(),
  error: z.string().optional(),
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

/** Legacy account form: email + current/new/confirm password (username is not editable). */
export const changePasswordSchema = z
  .object({
    email: emailSchema,
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm password is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
