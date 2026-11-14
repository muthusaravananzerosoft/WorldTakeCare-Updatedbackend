import { describe, expect, it } from 'vitest';
import { databaseClient } from '../src/database/client.js';

describe('database client', () => {
  it('reports not_configured when DATABASE_URL is unset', async () => {
    expect(await databaseClient.ping()).toBe('not_configured');
  });

  it('throws a readable error when connecting without DATABASE_URL', async () => {
    await expect(databaseClient.connect()).rejects.toThrow('DATABASE_URL is not configured');
  });

  it('disconnect is a no-op when no pool was created', async () => {
    await expect(databaseClient.disconnect()).resolves.toBeUndefined();
  });
});
