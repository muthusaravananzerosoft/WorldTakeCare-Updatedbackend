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
    '/destinations/search': {
      get: {
        tags: ['destinations'],
        summary:
          'Search worldwide destinations (cities, states, countries). Local reference data is searched first; an external geo provider fills in when local data has no match.',
        operationId: 'searchDestinations',
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 2, maxLength: 80 },
            description: 'Free-text search, e.g. "madurai"',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
          },
          {
            name: 'kind',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['country', 'state', 'city', 'place'] },
          },
        ],
        responses: {
          '200': {
            description: 'Matching destinations, best matches first',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DestinationSearchResponse' },
              },
            },
          },
          '400': {
            description: 'Validation failed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/destinations/{id}': {
      get: {
        tags: ['destinations'],
        summary: 'Destination details by id (coordinates resolved lazily)',
        operationId: 'getDestination',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', minimum: 1 },
          },
        ],
        responses: {
          '200': {
            description: 'Destination record',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Destination' } },
            },
          },
          '404': {
            description: 'Destination not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
        },
      },
    },
    '/destinations/{id}/attractions': {
      get: {
        tags: ['destinations'],
        summary:
          'Famous tourist attractions near the destination (e.g. Meenakshi Amman Temple near Madurai). Results are served from the local cache when available; the first call fetches from the places provider and caches them.',
        operationId: 'getDestinationAttractions',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer', minimum: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
          {
            name: 'radiusKm',
            in: 'query',
            required: false,
            schema: { type: 'number', minimum: 1, maximum: 50, default: 25 },
          },
        ],
        responses: {
          '200': {
            description: 'Destination plus its attractions, most famous first',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DestinationAttractionsResponse' },
              },
            },
          },
          '404': {
            description: 'Destination not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/trips': {
      post: {
        tags: ['trips'],
        summary: 'Create a trip (Save Trip). Owner is taken from the Bearer token.',
        operationId: 'createTrip',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/TripCreateRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Trip created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TripResponse' } },
            },
          },
          '400': {
            description: 'Validation failed or unknown destinationId',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
        },
      },
      get: {
        tags: ['trips'],
        summary: "List the authenticated user's trips",
        operationId: 'listTrips',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: "The user's trips, newest travel dates first",
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TripListResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
        },
      },
    },
    '/trips/{id}': {
      get: {
        tags: ['trips'],
        summary:
          'Trip detail. Owner always; non-owners only when visibility=public. Emergency contact and insurance are only returned to the owner.',
        operationId: 'getTrip',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': {
            description: 'Trip detail',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TripResponse' } },
            },
          },
          '404': {
            description: 'Trip not found (or private trip owned by someone else)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
        },
      },
      patch: {
        tags: ['trips'],
        summary: 'Update a trip — owner only. Arrays replace when sent.',
        operationId: 'updateTrip',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/TripUpdateRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated trip',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TripResponse' } },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
        },
      },
      delete: {
        tags: ['trips'],
        summary: 'Delete a trip — owner only',
        operationId: 'deleteTrip',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': {
            description: 'Trip deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean' }, data: { type: 'object' } },
                },
              },
            },
          },
          '404': {
            description: 'Trip not found',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
        },
      },
    },
    '/posts': {
      get: {
        tags: ['posts'],
        summary: 'Paginated travel-post feed (public)',
        operationId: 'listPosts',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Page of posts, newest first',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PostListResponse' } },
            },
          },
        },
      },
      post: {
        tags: ['posts'],
        summary: 'Create a travel post',
        operationId: 'createPost',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PostCreateRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Post created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PostResponse' } },
            },
          },
          '400': { description: 'Validation failed' },
          '401': { description: 'Missing or invalid token' },
        },
      },
    },
    '/posts/{id}': {
      get: {
        tags: ['posts'],
        summary: 'Post detail (public)',
        operationId: 'getPost',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': {
            description: 'Post detail',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PostResponse' } },
            },
          },
          '404': { description: 'Post not found' },
        },
      },
      patch: {
        tags: ['posts'],
        summary: 'Update a post — owner or admin',
        operationId: 'updatePost',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/PostUpdateRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated post',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/PostResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '404': { description: 'Post not found' },
        },
      },
      delete: {
        tags: ['posts'],
        summary: 'Delete a post — owner or admin',
        operationId: 'deletePost',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': { description: 'Post deleted' },
          '401': { description: 'Missing or invalid token' },
          '404': { description: 'Post not found' },
        },
      },
    },
    '/posts/{id}/comments': {
      get: {
        tags: ['posts'],
        summary: 'Paginated comments for a post (public)',
        operationId: 'listComments',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
        ],
        responses: {
          '200': {
            description: 'Page of comments, oldest first',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CommentListResponse' } },
            },
          },
          '404': { description: 'Post not found' },
        },
      },
      post: {
        tags: ['posts'],
        summary: 'Add a comment to a post',
        operationId: 'addComment',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CommentCreateRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Comment created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CommentResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '404': { description: 'Post not found' },
        },
      },
    },
    '/posts/{id}/comments/{commentId}': {
      patch: {
        tags: ['posts'],
        summary: 'Edit a comment — owner or admin',
        operationId: 'updateComment',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CommentCreateRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated comment',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CommentResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '404': { description: 'Comment not found' },
        },
      },
      delete: {
        tags: ['posts'],
        summary: 'Delete a comment — owner or admin',
        operationId: 'deleteComment',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
          { name: 'commentId', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': { description: 'Comment deleted' },
          '401': { description: 'Missing or invalid token' },
          '404': { description: 'Comment not found' },
        },
      },
    },
    '/featured-countries': {
      get: {
        tags: ['featured-countries'],
        summary: 'Curated top-tourist countries (public)',
        operationId: 'listFeaturedCountries',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 80 }, description: 'Search by country name' },
        ],
        responses: {
          '200': {
            description: 'Page of active featured countries',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/FeaturedCountryListResponse' } },
            },
          },
        },
      },
    },
    '/featured-countries/{id}': {
      get: {
        tags: ['featured-countries'],
        summary: 'One featured country (public)',
        operationId: 'getFeaturedCountry',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': {
            description: 'Country card detail with attribution',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/FeaturedCountryResponse' } },
            },
          },
          '404': { description: 'Country not found' },
        },
      },
    },
    '/admin/featured-countries': {
      post: {
        tags: ['admin'],
        summary: 'Add a featured country — admin only',
        operationId: 'createFeaturedCountry',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FeaturedCountryCreateRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Country created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/FeaturedCountryResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not an admin' },
          '409': { description: 'Country code already exists' },
        },
      },
    },
    '/admin/featured-countries/{id}': {
      patch: {
        tags: ['admin'],
        summary: 'Update a featured country — admin only',
        operationId: 'updateFeaturedCountry',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FeaturedCountryUpdateRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Updated country',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/FeaturedCountryResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not an admin' },
          '404': { description: 'Country not found' },
        },
      },
      delete: {
        tags: ['admin'],
        summary: 'Delete a featured country — admin only',
        operationId: 'deleteFeaturedCountry',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': { description: 'Country deleted' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not an admin' },
          '404': { description: 'Country not found' },
        },
      },
    },
    '/connections': {
      get: {
        tags: ['connections'],
        summary: 'My connections — member or guide view',
        operationId: 'listConnections',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'accepted', 'declined'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['sent', 'received', 'all'], default: 'all' } },
          { name: 'tripId', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Page of my connections with trip + party details',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ConnectionListResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
        },
      },
      post: {
        tags: ['connections'],
        summary: 'Send a connection request — member→guide or guide→member',
        operationId: 'createConnection',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ConnectionCreateRequest' } },
          },
        },
        responses: {
          '201': {
            description: 'Request created (or a previously declined request re-opened)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ConnectionResponse' } },
            },
          },
          '400': { description: 'Validation failed or self-request' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Wrong role for the chosen direction' },
          '404': { description: 'Trip, guide or member not found' },
          '409': { description: 'Pending request already exists or already connected' },
        },
      },
    },
    '/connections/{id}': {
      get: {
        tags: ['connections'],
        summary: 'Connection detail — parties only',
        operationId: 'getConnection',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': {
            description: 'Connection with trip + member + guide details',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ConnectionResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '404': { description: 'Connection not found or not yours' },
        },
      },
    },
    '/connections/{id}/accept': {
      patch: {
        tags: ['connections'],
        summary: 'Accept a pending request — recipient only',
        operationId: 'acceptConnection',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': {
            description: 'Connection accepted — parties may now chat',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ConnectionResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '404': { description: 'Connection not found or not yours' },
          '409': { description: 'Request already responded to' },
        },
      },
    },
    '/connections/{id}/decline': {
      patch: {
        tags: ['connections'],
        summary: 'Decline a pending request — recipient only',
        operationId: 'declineConnection',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': {
            description: 'Connection declined — chat stays closed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ConnectionResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '404': { description: 'Connection not found or not yours' },
          '409': { description: 'Request already responded to' },
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
      Destination: {
        type: 'object',
        required: ['id', 'kind', 'name'],
        properties: {
          id: { type: 'integer' },
          kind: { type: 'string', enum: ['country', 'state', 'city', 'place'] },
          name: { type: 'string', example: 'Madurai' },
          admin1: { type: ['string', 'null'], example: 'Tamil Nadu' },
          countryCode: { type: ['string', 'null'], example: 'IN' },
          countryName: { type: ['string', 'null'], example: 'India' },
          lat: { type: ['number', 'null'], example: 9.9252 },
          lng: { type: ['number', 'null'], example: 78.1198 },
        },
      },
      Attraction: {
        type: 'object',
        required: ['id', 'name', 'lat', 'lng', 'isFeatured', 'touristRelevance', 'source'],
        properties: {
          id: { type: 'integer' },
          name: { type: 'string', example: 'Meenakshi Amman Temple' },
          originalName: {
            type: ['string', 'null'],
            description: 'Local-script name when it differs from the display name',
          },
          category: { type: ['string', 'null'], example: 'hindu temple' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          distanceM: {
            type: ['integer', 'null'],
            description: 'Distance from the destination centre in metres',
          },
          dayTrip: {
            type: 'boolean',
            description: 'True when >12km away — a day-trip destination, not a city sight',
          },
          isFeatured: { type: 'boolean', description: 'Verified/curated famous spot' },
          touristRelevance: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description:
              'Computed category-based relevance score (not a provider rating); higher = more tourist-relevant',
          },
          source: { type: 'string', enum: ['geoapify', 'curated'] },
        },
      },
      DestinationSearchResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              results: {
                type: 'array',
                items: { $ref: '#/components/schemas/Destination' },
              },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      DestinationAttractionsResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              destination: { $ref: '#/components/schemas/Destination' },
              attractions: {
                type: 'array',
                items: { $ref: '#/components/schemas/Attraction' },
              },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      TripCreateRequest: {
        type: 'object',
        required: ['destinationId', 'startDate', 'endDate'],
        properties: {
          destinationId: { type: 'integer', minimum: 1, example: 47 },
          startDate: { type: 'string', format: 'date', example: '2026-12-12' },
          endDate: { type: 'string', format: 'date', example: '2026-12-15' },
          tripType: { type: 'string', maxLength: 40, example: 'family' },
          interests: {
            type: 'array',
            maxItems: 20,
            items: { type: 'string', maxLength: 60 },
            example: ['beaches', 'food'],
          },
          notes: { type: 'string', maxLength: 2000 },
          accommodation: { type: 'string', maxLength: 60, example: 'resort' },
          dietaryPreferences: {
            type: 'array',
            maxItems: 20,
            items: { type: 'string', maxLength: 60 },
            example: ['vegetarian', 'halal'],
          },
          emergencyContact: {
            type: 'object',
            required: ['name', 'phone'],
            properties: {
              name: { type: 'string', maxLength: 120 },
              phone: { type: 'string', maxLength: 40, example: '+911234567890' },
            },
          },
          insurance: {
            type: 'object',
            required: ['provider', 'insuranceNumber'],
            properties: {
              provider: { type: 'string', maxLength: 160 },
              insuranceNumber: { type: 'string', maxLength: 80 },
            },
          },
          budget: {
            type: 'object',
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0, example: 2300 },
              currency: { type: 'string', minLength: 3, maxLength: 3, example: 'USD' },
            },
          },
          visibility: { type: 'string', enum: ['public', 'private', 'friends'], default: 'private' },
          planMode: {
            type: 'string',
            enum: ['auto', 'manual'],
            default: 'auto',
            description: 'manual = user-built itinerary; restored when the trip roadmap reopens',
          },
          itinerary: {
            type: 'array',
            maxItems: 60,
            description:
              'Day-wise plan. day must be 1..(trip length); every attractionId must exist and belong to the destination. PATCH replaces the whole array.',
            items: { $ref: '#/components/schemas/ItineraryDay' },
          },
        },
      },
      TripUpdateRequest: {
        type: 'object',
        description: 'Same shape as TripCreateRequest; every field optional',
      },
      ItineraryStop: {
        type: 'object',
        required: ['attractionId', 'order'],
        properties: {
          attractionId: {
            type: 'integer',
            minimum: 1,
            description: 'Stable id from GET /destinations/{id}/attractions',
          },
          order: { type: 'integer', minimum: 1 },
          time: { type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', example: '09:00' },
          note: { type: 'string', maxLength: 500 },
        },
      },
      ItineraryDay: {
        type: 'object',
        required: ['day', 'stops'],
        properties: {
          day: { type: 'integer', minimum: 1 },
          stops: {
            type: 'array',
            maxItems: 50,
            items: { $ref: '#/components/schemas/ItineraryStop' },
          },
        },
      },
      ItineraryStopResult: {
        allOf: [
          { $ref: '#/components/schemas/ItineraryStop' },
          {
            type: 'object',
            properties: {
              attraction: {
                type: ['object', 'null'],
                description: 'Resolved attraction details (null in trip list responses)',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  originalName: { type: ['string', 'null'] },
                  category: { type: ['string', 'null'] },
                  distanceM: { type: ['integer', 'null'] },
                  rate: { type: ['integer', 'null'] },
                  source: { type: 'string' },
                },
              },
            },
          },
        ],
      },
      Trip: {
        type: 'object',
        required: ['id', 'destinationId', 'startDate', 'endDate', 'visibility', 'status'],
        properties: {
          id: { type: 'integer' },
          destinationId: { type: ['integer', 'null'] },
          destination: {
            type: ['object', 'null'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              admin1: { type: ['string', 'null'] },
              countryCode: { type: ['string', 'null'] },
            },
          },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          tripType: { type: ['string', 'null'] },
          interests: { type: 'array', items: { type: 'string' } },
          notes: { type: ['string', 'null'] },
          accommodation: { type: ['string', 'null'] },
          dietaryPreferences: { type: 'array', items: { type: 'string' } },
          emergencyContact: {
            type: ['object', 'null'],
            description: 'Only returned to the trip owner',
            properties: { name: { type: 'string' }, phone: { type: 'string' } },
          },
          insurance: {
            type: ['object', 'null'],
            description: 'Only returned to the trip owner',
            properties: {
              provider: { type: 'string' },
              insuranceNumber: { type: 'string' },
            },
          },
          budget: {
            type: ['object', 'null'],
            properties: { amount: { type: 'number' }, currency: { type: 'string' } },
          },
          visibility: { type: 'string', enum: ['public', 'private', 'friends'] },
          status: { type: 'string', enum: ['planned', 'ongoing', 'completed', 'cancelled'] },
          planMode: { type: 'string', enum: ['auto', 'manual'] },
          itinerary: {
            type: ['array', 'null'],
            items: {
              type: 'object',
              properties: {
                day: { type: 'integer' },
                stops: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ItineraryStopResult' },
                },
              },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TripResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/Trip' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      TripListResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              trips: { type: 'array', items: { $ref: '#/components/schemas/Trip' } },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      PostCreateRequest: {
        type: 'object',
        required: ['title', 'description', 'publishedDate'],
        properties: {
          title: { type: 'string', maxLength: 300, example: 'My Madurai temple tour' },
          description: { type: 'string', maxLength: 20000 },
          imageUrl: { type: 'string', format: 'uri', maxLength: 500 },
          publishedDate: { type: 'string', format: 'date', example: '2026-11-19' },
        },
      },
      PostUpdateRequest: {
        type: 'object',
        description: 'Same shape as PostCreateRequest; every field optional',
      },
      CommentCreateRequest: {
        type: 'object',
        required: ['comment'],
        properties: { comment: { type: 'string', maxLength: 2000 } },
      },
      Post: {
        type: 'object',
        required: ['id', 'title', 'description', 'readingTimeMin', 'publishedDate', 'author'],
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string' },
          imageUrl: { type: ['string', 'null'] },
          readingTimeMin: {
            type: 'integer',
            description: 'Auto-calculated estimate (~200 words/min)',
          },
          publishedDate: { type: 'string', format: 'date' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          author: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              firstName: { type: ['string', 'null'] },
              lastName: { type: ['string', 'null'] },
            },
          },
          commentCount: { type: 'integer' },
        },
      },
      Comment: {
        type: 'object',
        required: ['id', 'postId', 'comment', 'author'],
        properties: {
          id: { type: 'integer' },
          postId: { type: 'integer' },
          comment: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          author: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              firstName: { type: ['string', 'null'] },
              lastName: { type: ['string', 'null'] },
            },
          },
        },
      },
      PostResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/Post' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      PostListResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              posts: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      CommentResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/Comment' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      CommentListResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      FeaturedCountryCreateRequest: {
        type: 'object',
        required: ['countryName', 'countryCode', 'description', 'keywords', 'landmarkName'],
        properties: {
          countryName: { type: 'string', maxLength: 120, example: 'France' },
          countryCode: { type: 'string', pattern: '^[A-Z]{2}$', example: 'FR' },
          description: { type: 'string', maxLength: 300 },
          keywords: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: { type: 'string', maxLength: 30 },
            example: ['Architecture', 'Foodie', 'Museums'],
          },
          landmarkName: { type: 'string', maxLength: 160, example: 'Eiffel Tower' },
          imageUrl: { type: 'string', format: 'uri' },
          imageProvider: { type: 'string', example: 'unsplash' },
          imageId: { type: 'string' },
          photographerName: { type: 'string' },
          photographerUrl: { type: 'string', format: 'uri' },
          imageSourceUrl: { type: 'string', format: 'uri' },
          displayOrder: { type: 'integer', minimum: 0, default: 0 },
          isActive: { type: 'boolean', default: true },
        },
      },
      FeaturedCountryUpdateRequest: {
        type: 'object',
        description: 'Same shape as FeaturedCountryCreateRequest; every field optional',
      },
      FeaturedCountry: {
        type: 'object',
        required: ['id', 'countryName', 'countryCode', 'description', 'keywords', 'landmarkName'],
        properties: {
          id: { type: 'integer' },
          countryName: { type: 'string' },
          countryCode: { type: 'string' },
          description: { type: 'string' },
          keywords: { type: 'array', items: { type: 'string' } },
          landmarkName: { type: 'string' },
          image: {
            type: 'object',
            properties: {
              url: { type: ['string', 'null'] },
              provider: { type: ['string', 'null'] },
              id: { type: ['string', 'null'] },
              sourceUrl: { type: ['string', 'null'] },
            },
          },
          attribution: {
            type: 'object',
            description: 'Unsplash-required credit — must be rendered next to the image',
            properties: {
              photographerName: { type: ['string', 'null'] },
              photographerUrl: { type: ['string', 'null'] },
            },
          },
        },
      },
      FeaturedCountryResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/FeaturedCountry' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      FeaturedCountryListResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              countries: { type: 'array', items: { $ref: '#/components/schemas/FeaturedCountry' } },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      ConnectionCreateRequest: {
        type: 'object',
        description:
          'Exactly one of guideId (member invites guide) or memberId (guide invites member) is required; tripId is optional — omit it for a direct member↔guide request',
        properties: {
          tripId: { type: 'integer', minimum: 1 },
          guideId: { type: 'integer', minimum: 1 },
          memberId: { type: 'integer', minimum: 1 },
        },
      },
      ConnectionParty: {
        type: 'object',
        required: ['id', 'firstName', 'lastName'],
        properties: {
          id: { type: 'integer' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
      Connection: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          tripId: { type: 'integer' },
          tripDestination: {
            type: ['object', 'null'],
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              countryCode: { type: ['string', 'null'] },
              countryName: { type: ['string', 'null'] },
            },
          },
          member: { $ref: '#/components/schemas/ConnectionParty' },
          guide: { $ref: '#/components/schemas/ConnectionParty' },
          requesterUserId: { type: 'integer' },
          recipientUserId: { type: 'integer' },
          requesterRole: { type: 'string', enum: ['member', 'guide'] },
          status: { type: 'string', enum: ['pending', 'accepted', 'declined'] },
          requestedAt: { type: 'string', format: 'date-time' },
          respondedAt: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ConnectionResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/Connection' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      ConnectionListResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              connections: { type: 'array', items: { $ref: '#/components/schemas/Connection' } },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
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
