import { ERROR_CODES } from '../../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/errors/app-error.js';

/** Real image signatures — the declared MIME/extension is never trusted. */
const MAGIC: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    ext: 'png',
    test: (b) => b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a,
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    test: (b) =>
      b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Validates an uploaded image buffer by signature; returns the real type + narrowed file. */
export function validateImageUpload(file: Express.Multer.File | undefined): {
  mime: string;
  ext: string;
  file: Express.Multer.File;
} {
  if (!file) throw AppError.badRequest('An image file is required');
  if (file.size > IMAGE_MAX_BYTES) {
    throw AppError.badRequest('Image must be 2 MB or smaller');
  }
  const type = MAGIC.find((m) => m.mime === file.mimetype && m.test(file.buffer));
  if (!type) {
    throw new AppError(
      HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE,
      ERROR_CODES.UNSUPPORTED_FILE_TYPE,
      'File content is not a valid JPG, PNG or WebP image',
    );
  }
  return { ...type, file };
}
