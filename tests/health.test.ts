import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('GET /api/v1/health', () => {
  it('returns 200 with the standard success envelope', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        service: 'WorldTakeCare API',
        environment: 'test',
        apiVersion: 'v1',
        checks: { database: 'not_configured' },
      },
    });
    expect(res.body.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Date.parse(res.body.data.timestamp)).not.toBeNaN();
    expect(res.body.meta.requestId).toBe(res.headers['x-request-id']);
  });

  it('is only served under the versioned prefix', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(404);
  });
});
