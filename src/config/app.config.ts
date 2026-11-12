import { API_PREFIX, API_VERSION } from '../common/constants/api.constants.js';
import { env } from './env.config.js';

export const appConfig = {
  name: 'WorldTakeCare API',
  version: '0.1.0',
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  apiVersion: API_VERSION,
  apiPrefix: API_PREFIX,
  docs: {
    enabled: env.API_DOCS_ENABLED ?? env.NODE_ENV !== 'production',
    uiPath: '/api/docs',
    jsonPath: '/api/docs.json',
  },
  logFormat: env.LOG_FORMAT,
  jsonBodyLimit: env.JSON_BODY_LIMIT,
  trustProxy: env.TRUST_PROXY,
  shutdownTimeoutMs: env.SHUTDOWN_TIMEOUT_MS,
} as const;
