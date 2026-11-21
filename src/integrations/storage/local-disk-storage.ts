import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, normalize, resolve } from 'node:path';
import { env } from '../../config/env.config.js';
import type { MediaStorage } from './media-storage.interface.js';

/**
 * Local-disk MediaStorage — writes objects under MEDIA_STORAGE_DIR, served
 * publicly at /uploads/<key> (mounted in app.ts). URLs are absolute via
 * APP_BASE_URL so they work behind cPanel/LiteSpeed too.
 * Swap this adapter for S3/object storage later — callers only see MediaStorage.
 */
const ROOT = resolve(env.MEDIA_STORAGE_DIR);
const PUBLIC_PREFIX = '/uploads/';

/** Resolves a key to a path inside ROOT, refusing traversal outside it. */
function safePath(key: string): string {
  const path = resolve(ROOT, normalize(key));
  if (!path.startsWith(ROOT + '\\') && !path.startsWith(ROOT + '/')) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
  return path;
}

export const localDiskStorage: MediaStorage = {
  async put(key, data, contentType) {
    const path = safePath(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    return {
      key,
      url: `${env.APP_BASE_URL}${PUBLIC_PREFIX}${key}`,
      contentType,
      sizeBytes: data.length,
    };
  },

  async delete(key) {
    try {
      await unlink(safePath(key));
    } catch {
      // already gone — deletes are best-effort
    }
  },

  getUrl(key) {
    return `${env.APP_BASE_URL}${PUBLIC_PREFIX}${key}`;
  },
};

/** Extracts the storage key from a URL we issued, or null for foreign URLs. */
export function keyFromStoredUrl(url: string | null): string | null {
  if (!url) return null;
  const idx = url.indexOf(PUBLIC_PREFIX);
  if (idx === -1) return null;
  return url.slice(idx + PUBLIC_PREFIX.length);
}

export { PUBLIC_PREFIX as UPLOADS_URL_PREFIX };
