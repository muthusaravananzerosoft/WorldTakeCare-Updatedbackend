import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { USER_ROLES } from '../src/common/constants/auth.constants.js';
import {
  configureTokenVerifier,
  requireAuth,
  requireRole,
} from '../src/middleware/auth.middleware.js';
import { errorMiddleware } from '../src/middleware/error.middleware.js';
import { requestIdMiddleware } from '../src/middleware/request-id.middleware.js';

const app = express();
app.use(requestIdMiddleware);
app.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
app.get('/admin', requireAuth, requireRole(USER_ROLES.ADMIN), (_req, res) =>
  res.json({ ok: true }),
);
app.use(errorMiddleware);

describe('requireAuth', () => {
  it('rejects a missing Authorization header with a JSON 401', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects when no token verifier is configured yet', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Bearer anything');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('not configured');
  });
});

describe('with a configured verifier', () => {
  it('sets req.user from the verified token', async () => {
    configureTokenVerifier(() => ({ id: 42, role: USER_ROLES.MEMBER }));

    const res = await request(app).get('/me').set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 42, role: 'member' });
  });

  it('rejects a token the verifier refuses', async () => {
    configureTokenVerifier((token) => {
      if (token !== 'good') throw new Error('bad token');
      return { id: 1, role: USER_ROLES.MEMBER };
    });

    const res = await request(app).get('/me').set('Authorization', 'Bearer bad');
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired token');
  });
});

describe('requireRole', () => {
  it('rejects a member on an admin route with a JSON 403', async () => {
    configureTokenVerifier(() => ({ id: 7, role: USER_ROLES.MEMBER }));
    const res = await request(app).get('/admin').set('Authorization', 'Bearer t');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows an admin on an admin route', async () => {
    configureTokenVerifier(() => ({ id: 1, role: USER_ROLES.ADMIN }));
    const res = await request(app).get('/admin').set('Authorization', 'Bearer t');
    expect(res.status).toBe(200);
  });
});
