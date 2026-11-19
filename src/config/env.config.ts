import { existsSync } from 'node:fs';
import { z } from 'zod';

// Load `.env` with Node's built-in loader (no dotenv dependency). Real
// environment variables always win because loadEnvFile never overrides them.
if (process.env.NODE_ENV !== 'test' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CORS_ORIGINS: z
    .string({ error: 'CORS_ORIGINS is required (comma-separated list of allowed origins)' })
    .min(1, 'CORS_ORIGINS must not be empty')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url({ error: 'Each CORS origin must be a valid URL' })).min(1)),
  API_DOCS_ENABLED: booleanString.optional(),
  // Optional: API runs without a database until this is set (health reports 'not_configured').
  DATABASE_URL: z
    .url({ error: 'DATABASE_URL must be a valid URL, e.g. mysql://root@localhost:3306/dbname' })
    .optional(),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  LOG_FORMAT: z.enum(['dev', 'combined', 'common', 'short', 'tiny']).default('dev'),
  JSON_BODY_LIMIT: z.string().default('1mb'),
  TRUST_PROXY: z
    .string()
    .default('false')
    .transform((value): boolean | number => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      const hops = Number(value);
      return Number.isInteger(hops) && hops >= 0 ? hops : false;
    }),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  // Auth — dev default keeps local runs/test working; MUST be overridden in production.
  JWT_ACCESS_SECRET: z.string().min(32).default('dev-only-secret-change-me-0123456789'),
  // Minutes until an access token expires. 0 = access tokens never expire.
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().min(0).default(0),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Base URL used to build links inside transactional emails.
  APP_BASE_URL: z
    .url()
    .default('http://localhost:4000')
    .transform((value) => value.replace(/\/+$/, '')),
  // Frontend site base URL — activation/reset email links point at the
  // web app's pages, which then call the API themselves.
  WEB_APP_URL: z
    .url()
    .default('http://localhost:3000')
    .transform((value) => value.replace(/\/+$/, '')),
  // Outbound mail. When SMTP_HOST is unset the app uses the console mailer
  // (links printed to the server log) — real SMTP activates automatically.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('WorldTaker <no-reply@worldtaker.local>'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().max(100).default(10),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
