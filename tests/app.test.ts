import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();
const ALLOWED_ORIGIN = 'http://localhost:3000';

describe('error handling', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: 'Route GET /api/v1/does-not-exist not found' },
    });
    expect(res.body.meta.requestId).toBeTruthy();
  });

  it('returns a JSON 400 for malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 when the body exceeds the size limit', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ data: 'x'.repeat(1024 * 1024 + 10) }));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('CORS', () => {
  it('allows configured origins', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', ALLOWED_ORIGIN);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('answers preflight requests for configured origins', async () => {
    const res = await request(app)
      .options('/api/v1/health')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });

  it('rejects other browser origins with a JSON 403', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');

    expect(res.status).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.body.error.code).toBe('CORS_NOT_ALLOWED');
  });

  it('allows requests without an Origin header (mobile apps, server-to-server)', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
  });
});

describe('request id', () => {
  it('reuses a well-formed incoming X-Request-Id', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', 'client-abc.123');
    expect(res.headers['x-request-id']).toBe('client-abc.123');
    expect(res.body.meta.requestId).toBe('client-abc.123');
  });

  it('replaces an unsafe incoming X-Request-Id', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', '<script>');
    expect(res.headers['x-request-id']).not.toBe('<script>');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('security headers', () => {
  it('sets helmet headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('API documentation', () => {
  it('serves the OpenAPI document with every registered module as a tag', async () => {
    const res = await request(app).get('/api/docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.paths['/health']).toBeDefined();
    expect(res.body.tags.map((tag: { name: string }) => tag.name)).toContain('auth');
  });

  it('serves the Swagger UI', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
