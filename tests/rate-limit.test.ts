import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from '../src/middleware/error.middleware.js';
import { createRateLimiter } from '../src/middleware/rate-limit.middleware.js';
import { requestIdMiddleware } from '../src/middleware/request-id.middleware.js';

const app = express();
app.use(requestIdMiddleware);
app.use(createRateLimiter({ windowMs: 60_000, max: 2 }));
app.get('/limited', (_req, res) => res.json({ ok: true }));
app.use(errorMiddleware);

describe('rate limit middleware', () => {
  it('allows requests under the limit then returns a JSON 429', async () => {
    expect((await request(app).get('/limited')).status).toBe(200);
    expect((await request(app).get('/limited')).status).toBe(200);

    const res = await request(app).get('/limited');
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});
