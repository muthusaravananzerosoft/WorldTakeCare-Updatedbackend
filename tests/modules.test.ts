import { existsSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { MODULES } from '../src/modules/module-registry.js';

const modulesDir = join(import.meta.dirname, '..', 'src', 'modules');
const app = createApp();

describe('module registry', () => {
  it('has unique names and base paths', () => {
    const names = MODULES.map((m) => m.name);
    const paths = MODULES.map((m) => m.basePath);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each(MODULES.map((m) => [m.name, m] as const))(
    'module "%s" has a folder with a README',
    (name, module) => {
      expect(existsSync(join(modulesDir, name))).toBe(true);
      if (module.status === 'planned') {
        expect(existsSync(join(modulesDir, name, 'README.md'))).toBe(true);
      }
    },
  );

  it.each(
    MODULES.filter((m) => m.status === 'implemented').map((m) => [m.name, m.basePath] as const),
  )('implemented module "%s" is mounted under /api/v1', async (_name, basePath) => {
    const res = await request(app).get(`/api/v1${basePath}`);
    expect(res.status).not.toBe(404);
  });

  it.each(MODULES.filter((m) => m.status === 'planned').map((m) => [m.name, m.basePath] as const))(
    'planned module "%s" is not exposed yet',
    async (_name, basePath) => {
      const res = await request(app).get(`/api/v1${basePath}`);
      expect(res.status).toBe(404);
    },
  );
});
