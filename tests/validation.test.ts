import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { sendSuccess } from '../src/common/responses/api-response.js';
import { AppError } from '../src/common/errors/app-error.js';
import { errorMiddleware } from '../src/middleware/error.middleware.js';
import { requestIdMiddleware } from '../src/middleware/request-id.middleware.js';
import { validate } from '../src/middleware/validate.middleware.js';

/** Minimal app that exercises the shared middleware the way a real module will. */
function buildTestApp() {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());

  app.post(
    '/members/:id/likes',
    validate({
      params: z.object({ id: z.coerce.number().int().positive() }),
      query: z.object({ notify: z.enum(['true', 'false']).default('true') }),
      body: z.object({ note: z.string().max(10).optional() }).strict(),
    }),
    (req, res) => {
      sendSuccess(req, res, res.locals.validated, 201);
    },
  );

  app.get('/boom', () => {
    throw new Error('database exploded');
  });

  app.get('/conflict', () => {
    throw AppError.conflict('Already liked');
  });

  app.use(errorMiddleware);
  return app;
}

const app = buildTestApp();

describe('validate() middleware', () => {
  it('passes parsed and coerced values to the handler', async () => {
    const res = await request(app).post('/members/42/likes').send({ note: 'hi' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      params: { id: 42 },
      query: { notify: 'true' },
      body: { note: 'hi' },
    });
  });

  it('collects issues from every request part into one 400 response', async () => {
    const res = await request(app)
      .post('/members/abc/likes?notify=maybe')
      .send({ note: 'way too long note', roles: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const locations = res.body.error.details.map((d: { location: string }) => d.location);
    expect(locations).toEqual(expect.arrayContaining(['params', 'query', 'body']));
  });

  it('rejects unknown body fields with .strict() (mass-assignment guard)', async () => {
    const res = await request(app).post('/members/1/likes').send({ roles: 1 });
    expect(res.status).toBe(400);
  });
});

describe('error middleware', () => {
  it('maps AppError to its status and code', async () => {
    const res = await request(app).get('/conflict');
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'CONFLICT', message: 'Already liked' });
  });

  it('converts unexpected errors to a 500 INTERNAL_ERROR and logs them', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
