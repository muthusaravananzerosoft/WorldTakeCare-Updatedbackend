import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

/**
 * API-level auth tests. No DATABASE_URL in the test env, so these cover
 * validation (rejected before any DB call) and unauthenticated paths.
 * Full end-to-end coverage lives in auth-service.test.ts.
 */
const app = createApp();

const validBody = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  confirmEmail: 'test@example.com',
  password: 'Passw0rd!x',
  sex: 'male',
  dob: '1998-05-14',
  countryCode: 'IN',
  role: 'guide',
};

describe('GET /api/v1/auth', () => {
  it('returns the auth service info', async () => {
    const res = await request(app).get('/api/v1/auth');
    expect(res.status).toBe(200);
    expect(res.body.data.service).toBe('auth');
  });
});

describe('POST /api/v1/auth/register validation', () => {
  it('rejects an empty body with per-field issues', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(3);
  });

  it('rejects mismatched emails', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, confirmEmail: 'other@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects an under-18 date of birth', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, dob: '2015-01-01' });
    expect(res.status).toBe(400);
  });

  it('rejects role=admin — it is not self-assignable', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, role: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('other auth endpoints validation', () => {
  it('login requires a valid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
  });

  it('forgot-password requires a valid email', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'bad' });
    expect(res.status).toBe(400);
  });

  it('refresh requires a token', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('activate requires a token', async () => {
    const res = await request(app).get('/api/v1/auth/activate');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
