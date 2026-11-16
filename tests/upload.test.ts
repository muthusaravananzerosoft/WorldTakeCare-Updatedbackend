import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from '../src/middleware/error.middleware.js';
import { requestIdMiddleware } from '../src/middleware/request-id.middleware.js';
import { createUpload, IMAGE_MIME_TYPES } from '../src/middleware/upload.middleware.js';

const app = express();
app.use(requestIdMiddleware);

app.post(
  '/photo',
  createUpload({ allowedMimeTypes: IMAGE_MIME_TYPES }).single('file'),
  (req, res) => res.json({ size: req.file?.size, mime: req.file?.mimetype }),
);
app.post('/tiny', createUpload({ maxFileSizeBytes: 10 }).single('file'), (_req, res) =>
  res.json({ ok: true }),
);
app.use(errorMiddleware);

describe('upload middleware', () => {
  it('accepts an allowed image type and exposes the file in memory', async () => {
    const res = await request(app)
      .post('/photo')
      .attach('file', Buffer.from('fake-png-bytes'), {
        filename: 'a.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.mime).toBe('image/png');
    expect(res.body.size).toBe(14);
  });

  it('rejects a disallowed file type with a JSON 415', async () => {
    const res = await request(app)
      .post('/photo')
      .attach('file', Buffer.from('MZ90'), {
        filename: 'x.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('rejects an oversized file with a JSON 413', async () => {
    const res = await request(app)
      .post('/tiny')
      .attach('file', Buffer.alloc(50), {
        filename: 'big.bin',
        contentType: 'application/octet-stream',
      });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
