import { appConfig } from '../config/app.config.js';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { MODULES } from '../common/constants/module-registry.js';

const meta = {
  type: 'object',
  required: ['requestId', 'timestamp'],
  properties: {
    requestId: { type: 'string', example: '1b7f0c8e-6a4e-4e7b-9d0a-3c8c1f9f2a11' },
    timestamp: { type: 'string', format: 'date-time' },
  },
} as const;

/** OpenAPI 3.1 document. Each implemented module adds its paths here. */
export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: appConfig.name,
    version: appConfig.version,
    description:
      'REST API for WorldTakeCare (successor of the WorldTaker PHP application). ' +
      'All endpoints are versioned under `/api/v1` and return the standard envelope ' +
      '`{ success, data | error, meta }`.',
  },
  servers: [{ url: appConfig.apiPrefix, description: 'Current API version' }],
  tags: MODULES.map((module) => ({
    name: module.name,
    description: `${module.status === 'implemented' ? '' : '[planned] '}${module.summary}`,
  })),
  paths: {
    '/health': {
      get: {
        tags: ['health'],
        summary: 'Service health check',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'The API process is running',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ResponseMeta: meta,
      ErrorResponse: {
        type: 'object',
        required: ['success', 'error', 'meta'],
        properties: {
          success: { type: 'boolean', const: false },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', enum: Object.values(ERROR_CODES) },
              message: { type: 'string' },
              details: {},
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            required: [
              'status',
              'service',
              'version',
              'environment',
              'apiVersion',
              'uptimeSeconds',
              'timestamp',
              'checks',
            ],
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded'] },
              service: { type: 'string', example: appConfig.name },
              version: { type: 'string', example: appConfig.version },
              environment: { type: 'string', enum: ['development', 'test', 'production'] },
              apiVersion: { type: 'string', example: appConfig.apiVersion },
              uptimeSeconds: { type: 'integer', minimum: 0 },
              timestamp: { type: 'string', format: 'date-time' },
              checks: {
                type: 'object',
                properties: {
                  database: { type: 'string', enum: ['up', 'down', 'not_configured'] },
                },
              },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
    },
  },
} as const;
