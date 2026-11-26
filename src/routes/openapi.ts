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
    '/auth/change-password': {
      post: {
        tags: ['auth'],
        summary:
          'Account save — change email and/or password (current + new + confirm). Other sessions are revoked; the response carries a fresh token pair so the caller stays logged in.',
        operationId: 'changePassword',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Password updated — includes a new token pair',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          '400': { description: 'Wrong current password, weak new password or mismatch' },
          '401': { description: 'Missing or invalid access token' },
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
    '/users/me/profile': {
      get: {
        tags: ['users'],
        summary:
          'Own member profile — personal details, primary/secondary locations, visited and visiting countries with resolved names + computed age.',
        operationId: 'getMyProfile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Complete member profile',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProfileResponse' } },
            },
          },
          '401': { description: 'Missing or invalid access token' },
          '404': { description: 'User not found' },
        },
      },
      put: {
        tags: ['users'],
        summary:
          'Save the member profile in one call (legacy account page) — text sections, profile photo and cover image together. Send JSON for text-only updates; send multipart/form-data with a `profile` JSON field plus optional `profileImage`/`coverImage` files to change images. removeProfileImage/removeCoverImage flags clear them.',
        operationId: 'updateMyProfile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/UpdateProfileRequest' } },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  profile: {
                    type: 'string',
                    description:
                      'UpdateProfileRequest JSON as a string; may be {} for image-only updates',
                  },
                  profileImage: {
                    type: 'string',
                    format: 'binary',
                    description: 'New profile photo (user.profile_img); JPG/PNG/WebP, max 2 MB',
                  },
                  coverImage: {
                    type: 'string',
                    format: 'binary',
                    description: 'New cover/avatar image (user.img); JPG/PNG/WebP, max 2 MB',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Saved profile echoed back',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ProfileResponse' } },
            },
          },
          '400': { description: 'Validation failed, unknown references or state↔country mismatch' },
          '401': { description: 'Missing or invalid access token' },
          '415': { description: 'An uploaded file is not a valid JPG/PNG/WebP image' },
        },
      },
    },
    '/users/newest': {
      get: {
        tags: ['users'],
        summary:
          'Newest members for the public homepage — active, non-suspended members only (guides and admins excluded), ordered by registration date.',
        operationId: 'newestMembers',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 15 },
          },
        ],
        responses: {
          '200': {
            description:
              'Newest member cards: id, username, first/last name, sex, age, country, profileImage, online',
          },
        },
      },
    },
    '/reference/options': {
      get: {
        tags: ['reference-data'],
        summary:
          'Dropdown options for profile/registration forms: countries, races, heights, educations, religions, marital statuses, sex, traits, looking-to-meet.',
        operationId: 'referenceOptions',
        responses: {
          '200': { description: 'All option lists' },
        },
      },
    },
    '/reference/countries/{code}/states': {
      get: {
        tags: ['reference-data'],
        summary: 'States/provinces of one country (ISO alpha-2 code) for cascading selects.',
        operationId: 'countryStates',
        parameters: [
          {
            name: 'code',
            in: 'path',
            required: true,
            schema: { type: 'string', minLength: 2, maxLength: 2, example: 'US' },
          },
        ],
        responses: {
          '200': { description: 'Country plus its states' },
          '400': { description: 'Unknown country code' },
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
    '/connections': {
      get: {
        tags: ['connections'],
        summary: 'My connections — member or guide view',
        operationId: 'listConnections',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'accepted', 'declined'] } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['sent', 'received', 'all'], default: 'all' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'Page of my connections with party details',
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
          '404': { description: 'Guide or member not found' },
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
            description: 'Connection with member + guide details',
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
    '/guides/me/profile': {
      get: {
        tags: ['guides'],
        summary: 'My guide profile — empty shell when none exists yet',
        operationId: 'getMyGuideProfile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'The guide\'s own profile (or empty defaults before first save)',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuideProfileResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not a guide' },
        },
      },
      patch: {
        tags: ['guides'],
        summary: 'Create or partially update my guide profile',
        operationId: 'upsertMyGuideProfile',
        security: [{ bearerAuth: [] }],
        description:
          'Creates the profile on first call; afterwards only supplied fields change. null clears a field, [] clears an array. verificationStatus/profileStatus are rejected.',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/GuideProfileUpdateRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Saved profile',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuideProfileResponse' } },
            },
          },
          '400': { description: 'Validation failed or restricted field sent' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not a guide' },
        },
      },
    },
    '/guides/me/profile/cover': {
      post: {
        tags: ['guides'],
        summary: 'Upload/replace cover photo — JPG/PNG/WebP, max 2 MB',
        operationId: 'uploadGuideCover',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'New cover image URL',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuideCoverResponse' } },
            },
          },
          '400': { description: 'Missing file or over 2 MB' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not a guide' },
          '415': { description: 'Not a valid JPG/PNG/WebP image' },
        },
      },
      delete: {
        tags: ['guides'],
        summary: 'Remove cover photo',
        operationId: 'deleteGuideCover',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Cover image removed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuideCoverResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not a guide' },
        },
      },
    },
    '/guides/me/profile/photo': {
      post: {
        tags: ['guides'],
        summary: 'Upload/replace profile photo — JPG/PNG/WebP, max 2 MB',
        operationId: 'uploadGuideProfileImage',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'New profile image URL',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuideProfileImageResponse' } },
            },
          },
          '400': { description: 'Missing file or over 2 MB' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not a guide' },
          '415': { description: 'Not a valid JPG/PNG/WebP image' },
        },
      },
      delete: {
        tags: ['guides'],
        summary: 'Remove profile photo',
        operationId: 'deleteGuideProfileImage',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile image removed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuideProfileImageResponse' } },
            },
          },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not a guide' },
        },
      },
    },
    '/guides': {
      get: {
        tags: ['guides'],
        summary: 'Public guide directory — published profiles only',
        operationId: 'listGuides',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 80 }, description: 'Name, city or country search' },
          { name: 'language', in: 'query', schema: { type: 'string', maxLength: 60 } },
          { name: 'specialty', in: 'query', schema: { type: 'string', maxLength: 60 } },
          { name: 'maxHourlyRate', in: 'query', schema: { type: 'number', minimum: 0 }, description: 'Requires currency' },
          { name: 'currency', in: 'query', schema: { type: 'string', pattern: '^[A-Z]{3}$' } },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['recommended', 'price_asc', 'experience_desc'], default: 'recommended' }, description: 'price_asc requires currency' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 12 } },
        ],
        responses: {
          '200': {
            description: 'Page of published guides',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuideListResponse' } },
            },
          },
          '400': { description: 'Invalid filters (e.g. price filter without currency)' },
        },
      },
    },
    '/guides/{id}': {
      get: {
        tags: ['guides'],
        summary: 'Public guide detail — published only',
        operationId: 'getGuide',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
        ],
        responses: {
          '200': {
            description: 'Public guide detail',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuidePublicResponse' } },
            },
          },
          '404': { description: 'Guide not found, draft or suspended' },
        },
      },
    },
    '/guides/me/profile/publish': {
      post: {
        tags: ['guides'],
        summary: 'Publish my guide profile — makes it publicly listed',
        operationId: 'publishGuideProfile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Published profile',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/GuideProfileResponse' } },
            },
          },
          '400': { description: 'Profile incomplete — details.missing lists required fields' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Not a guide' },
          '404': { description: 'No profile saved yet' },
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
      ChangePasswordRequest: {
        type: 'object',
        required: ['email', 'currentPassword', 'newPassword', 'confirmPassword'],
        properties: {
          email: { type: 'string', format: 'email', description: 'Account email (may be updated)' },
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 8, maxLength: 72 },
          confirmPassword: { type: 'string', minLength: 1, description: 'Must equal newPassword' },
        },
      },
      LocationInput: {
        type: 'object',
        properties: {
          countryCode: { type: 'string', minLength: 2, maxLength: 2, nullable: true, example: 'US' },
          stateId: { type: 'integer', nullable: true, description: 'country_states.sta_id — must belong to the country' },
          city: { type: 'string', maxLength: 500, nullable: true },
          zip: { type: 'string', maxLength: 10, nullable: true },
          timezone: { type: 'string', maxLength: 50, nullable: true },
        },
      },
      PersonalInput: {
        type: 'object',
        required: ['firstName', 'lastName'],
        properties: {
          firstName: { type: 'string', minLength: 2, maxLength: 30 },
          lastName: { type: 'string', minLength: 2, maxLength: 30 },
          sex: { type: 'string', enum: ['male', 'female'], nullable: true },
          dob: { type: 'string', format: 'date', nullable: true, description: 'YYYY-MM-DD, 18+ only' },
          countryOfBirth: { type: 'string', minLength: 2, maxLength: 2, nullable: true },
          raceId: { type: 'integer', nullable: true },
          religionId: { type: 'integer', minimum: 1, maximum: 7, nullable: true, description: '7 = Other → otherReligion required' },
          otherReligion: { type: 'string', maxLength: 200, nullable: true },
          heightId: { type: 'integer', nullable: true },
          maritalStatus: {
            type: 'string',
            enum: ['available', 'seeing_someone', 'complicated', 'single', 'married', 'separated', 'divorced', 'widowed', 'offline'],
          },
          educationId: { type: 'integer', nullable: true },
          languages: { type: 'string', maxLength: 500, nullable: true },
          traits: { type: 'array', items: { type: 'string', enum: ['non_smoker', 'vegetarian', 'tourist_guide'] } },
          nationalities: { type: 'array', maxItems: 5, items: { type: 'string', minLength: 2, maxLength: 2 } },
          lookingToMeet: { type: 'string', enum: ['man', 'woman', 'man_or_woman', 'other'], nullable: true },
          lookingToMeetOther: { type: 'string', maxLength: 50, nullable: true, description: "Required when lookingToMeet = 'other'" },
          writeSomething: { type: 'string', nullable: true },
          about: { type: 'string', nullable: true },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        properties: {
          personal: { $ref: '#/components/schemas/PersonalInput' },
          location: {
            type: 'object',
            properties: {
              primary: { $ref: '#/components/schemas/LocationInput' },
              secondary: { $ref: '#/components/schemas/LocationInput' },
            },
          },
          visitedCountries: {
            type: 'array',
            description: 'Full replacement of the visited list',
            items: {
              type: 'object',
              required: ['countryCode', 'stateIds'],
              properties: {
                countryCode: { type: 'string', minLength: 2, maxLength: 2 },
                stateIds: { type: 'array', items: { type: 'integer' } },
              },
            },
          },
          visitingCountries: {
            type: 'array',
            maxItems: 2,
            description: 'Up to two ISO country codes; [] clears the selection',
            items: { type: 'string', minLength: 2, maxLength: 2 },
          },
          removeProfileImage: {
            type: 'boolean',
            description: 'Clears the profile photo (user.profile_img)',
          },
          removeCoverImage: {
            type: 'boolean',
            description: 'Clears the cover/avatar image (user.img)',
          },
        },
      },
      ProfileResponse: {
        type: 'object',
        description: 'Saved member profile with resolved names and computed age',
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
      ConnectionCreateRequest: {
        type: 'object',
        description:
          'Exactly one of guideId (member invites guide) or memberId (guide invites member) is required',
        properties: {
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
      GuideProfileUpdateRequest: {
        type: 'object',
        description:
          'All fields optional. null clears a field, [] clears an array. Restricted fields (verificationStatus, profileStatus, userId) are rejected.',
        properties: {
          firstName: { type: 'string', maxLength: 60 },
          lastName: { type: 'string', maxLength: 60 },
          headline: { type: ['string', 'null'], maxLength: 160 },
          bio: { type: ['string', 'null'], maxLength: 2000 },
          baseCity: { type: ['string', 'null'], maxLength: 120 },
          countryCode: { type: ['string', 'null'], pattern: '^[A-Z]{2}$' },
          guidingAreas: { type: ['array', 'null'], items: { type: 'string' }, maxItems: 50 },
          languages: { type: ['array', 'null'], items: { type: 'string' }, maxItems: 20 },
          yearsOfExperience: { type: ['integer', 'null'], minimum: 0, maximum: 80 },
          specialties: { type: ['array', 'null'], items: { type: 'string' }, maxItems: 50 },
          certificationTitle: { type: ['string', 'null'], maxLength: 160 },
          tourPreferences: {
            type: ['object', 'null'],
            properties: {
              privateTours: { type: 'boolean' },
              groupTours: { type: 'boolean' },
              typicalDuration: { type: 'string', maxLength: 60 },
              maxGroupSize: { type: 'integer', minimum: 1, maximum: 200 },
            },
          },
          hourlyRate: {
            type: ['object', 'null'],
            required: ['amount', 'currency'],
            properties: {
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string', pattern: '^[A-Z]{3}$' },
            },
          },
          contactPhone: { type: ['string', 'null'] },
          website: { type: ['string', 'null'], format: 'uri', maxLength: 500 },
        },
      },
      GuideProfile: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          headline: { type: ['string', 'null'] },
          bio: { type: ['string', 'null'] },
          baseCity: { type: ['string', 'null'] },
          countryCode: { type: ['string', 'null'] },
          guidingAreas: { type: ['array', 'null'], items: { type: 'string' } },
          languages: { type: ['array', 'null'], items: { type: 'string' } },
          yearsOfExperience: { type: ['integer', 'null'] },
          specialties: { type: ['array', 'null'], items: { type: 'string' } },
          certificationTitle: { type: ['string', 'null'] },
          tourPreferences: { type: ['object', 'null'] },
          hourlyRate: { type: ['object', 'null'] },
          contactPhone: { type: ['string', 'null'] },
          website: { type: ['string', 'null'] },
          coverImage: {
            type: ['object', 'null'],
            properties: { url: { type: 'string' } },
          },
          profileImage: {
            type: ['object', 'null'],
            properties: { url: { type: 'string' } },
          },
          verificationStatus: { type: 'string', enum: ['unverified', 'pending', 'verified', 'rejected'] },
          profileStatus: { type: 'string', enum: ['draft', 'published', 'suspended'] },
          updatedAt: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      GuideProfileResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/GuideProfile' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      GuideCoverResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              coverImage: {
                type: ['object', 'null'],
                properties: { url: { type: 'string' } },
              },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      GuidePublicCard: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: "Guide's user id — use in /guides/{id} and connections" },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          headline: { type: ['string', 'null'] },
          baseCity: { type: ['string', 'null'] },
          countryCode: { type: ['string', 'null'] },
          countryName: { type: ['string', 'null'] },
          languages: { type: ['array', 'null'], items: { type: 'string' } },
          yearsOfExperience: { type: ['integer', 'null'] },
          specialties: { type: ['array', 'null'], items: { type: 'string' } },
          hourlyRate: {
            type: ['object', 'null'],
            properties: { amount: { type: 'number' }, currency: { type: 'string' } },
          },
          maxGroupSize: { type: ['integer', 'null'] },
          profileImage: { type: ['object', 'null'], properties: { url: { type: 'string' } } },
          coverImage: { type: ['object', 'null'], properties: { url: { type: 'string' } } },
          verificationStatus: { type: 'string', enum: ['unverified', 'pending', 'verified', 'rejected'] },
          rating: { type: ['number', 'null'], description: 'null until the reviews module exists' },
          reviewCount: { type: 'integer' },
        },
      },
      GuidePublicDetail: {
        allOf: [
          { $ref: '#/components/schemas/GuidePublicCard' },
          {
            type: 'object',
            properties: {
              bio: { type: ['string', 'null'] },
              guidingAreas: { type: ['array', 'null'], items: { type: 'string' } },
              certificationTitle: { type: ['string', 'null'] },
              tourPreferences: { type: ['object', 'null'] },
            },
          },
        ],
      },
      GuidePublicResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: { $ref: '#/components/schemas/GuidePublicDetail' },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      GuideListResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              guides: { type: 'array', items: { $ref: '#/components/schemas/GuidePublicCard' } },
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' },
            },
          },
          meta: { $ref: '#/components/schemas/ResponseMeta' },
        },
      },
      GuideProfileImageResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            properties: {
              profileImage: {
                type: ['object', 'null'],
                properties: { url: { type: 'string' } },
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
