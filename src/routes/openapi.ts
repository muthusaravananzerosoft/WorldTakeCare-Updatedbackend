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
      'REST API for WorldTaker (successor of the WorldTaker PHP application). ' +
      'All endpoints are versioned under `/api/v1` and return the standard envelope ' +
      '`{ success, data | error, meta }`.',
  },
  servers: [{ url: appConfig.apiPrefix, description: 'Current API version' }],
  tags: MODULES.map((module) => ({
    name: module.name,
    description: `${module.status === 'implemented' ? '' : '[planned] '}${module.summary}`,
  })),
  paths: {
    '/auth/register': {
      post: {
        tags: ['auth'],
        summary: 'Register a new account (pending until email activation)',
        operationId: 'register',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } },
          },
        },
        responses: {
          '201': { description: 'Account created — activation email sent' },
          '400': {
            description: 'Validation failed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '409': {
            description: 'Email already registered',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/auth/activate': {
      get: {
        tags: ['auth'],
        summary: 'Activate an account via the emailed token',
        operationId: 'activateAccount',
        parameters: [
          {
            name: 'token',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 32 },
          },
        ],
        responses: {
          '200': {
            description:
              'Account activated — returns the token pair so the user is logged in immediately',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          '400': { description: 'Invalid, used or expired token' },
        },
      },
    },
    '/auth/resend-activation': {
      post: {
        tags: ['auth'],
        summary: 'Resend the activation email (always 200 — no enumeration)',
        operationId: 'resendActivation',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/EmailRequest' } },
          },
        },
        responses: {
          '200': { description: 'Sent if eligible' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Log in with email + password',
        operationId: 'login',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Token pair + public user',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          '401': { description: 'Invalid credentials' },
          '403': { description: 'Account not activated / suspended' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['auth'],
        summary: 'Rotate a refresh token for a new access token',
        operationId: 'refreshTokens',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'New token pair',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          '401': { description: 'Invalid, expired or reused refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['auth'],
        summary: 'Revoke a refresh token',
        operationId: 'logout',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } },
          },
        },
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['auth'],
        summary: 'Request a password reset link (always 200 — no enumeration)',
        operationId: 'forgotPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/EmailRequest' } },
          },
        },
        responses: {
          '200': { description: 'Sent if the account exists' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['auth'],
        summary: 'Set a new password via the emailed token (revokes all sessions)',
        operationId: 'resetPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } },
          },
        },
        responses: {
          '200': { description: 'Password updated' },
          '400': { description: 'Invalid, used or expired token' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['auth'],
        summary: 'Current user from the Bearer access token',
        operationId: 'getMe',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Public user profile' },
          '401': { description: 'Missing or invalid access token' },
        },
      },
    },
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
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: [
          'firstName',
          'lastName',
          'email',
          'confirmEmail',
          'password',
          'sex',
          'dob',
          'countryCode',
        ],
        properties: {
          firstName: { type: 'string', minLength: 2, maxLength: 30 },
          lastName: { type: 'string', minLength: 2, maxLength: 30 },
          email: { type: 'string', format: 'email' },
          confirmEmail: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 72 },
          sex: { type: 'string', enum: ['male', 'female'] },
          dob: { type: 'string', format: 'date', description: 'YYYY-MM-DD, must be 18+' },
          countryCode: { type: 'string', minLength: 2, maxLength: 2, example: 'IN' },
          role: { type: 'string', enum: ['member', 'guide'], default: 'member' },
          captchaToken: { type: 'string' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      EmailRequest: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: { type: 'string' },
          password: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  email: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  role: { type: 'string', enum: ['member', 'guide', 'admin'] },
                  status: { type: 'string', enum: ['pending', 'active', 'suspended', 'deleted'] },
                },
              },
              tokens: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  accessTokenExpiresIn: {
                    type: ['integer', 'null'],
                    description: 'Seconds until expiry — null when tokens do not expire',
                  },
                },
              },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
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
