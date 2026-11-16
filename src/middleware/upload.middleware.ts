import multer from 'multer';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { AppError } from '../common/errors/app-error.js';
import { env } from '../config/env.config.js';

/** MIME types for member photos (legacy accepted jpg/png/gif with no checks — see bug B-15). */
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;

/** MIME types for member background music (legacy accepted mp3 with no checks). */
export const AUDIO_MIME_TYPES = ['audio/mpeg'] as const;

export interface UploadOptions {
  /** Allowed MIME types for this route. Omit to accept any type. */
  allowedMimeTypes?: readonly string[];
  /** Per-file size cap in bytes. Defaults to UPLOAD_MAX_FILE_SIZE_MB. */
  maxFileSizeBytes?: number;
}

/**
 * Multer configured for a route's upload needs. Files are held in memory
 * (buffer) so they can be forwarded to the MediaStorage adapter — nothing is
 * written to local disk and type/size checks run on every file (the legacy
 * app performed neither).
 */
export function createUpload(options: UploadOptions = {}) {
  const allowed = options.allowedMimeTypes;
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: options.maxFileSizeBytes ?? env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
    },
    fileFilter(_req, file, callback) {
      if (allowed && !allowed.includes(file.mimetype)) {
        callback(
          new AppError(
            HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
            ERROR_CODES.UNSUPPORTED_FILE_TYPE,
            `File type ${file.mimetype} is not allowed`,
          ),
        );
        return;
      }
      callback(null, true);
    },
  });
}
