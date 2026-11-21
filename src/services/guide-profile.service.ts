import { randomUUID } from 'node:crypto';
import { AppError } from '../common/errors/app-error.js';
import { ERROR_CODES } from '../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import type {
  GuideProfilePatchInput,
  GuideProfileResult,
} from '../entities/guide-profile.types.js';
import { keyFromStoredUrl } from '../integrations/storage/local-disk-storage.js';
import { localDiskStorage } from '../integrations/storage/local-disk-storage.js';
import type { MediaStorage } from '../integrations/storage/media-storage.interface.js';
import type { GuideProfileRepository } from '../repositories/guide-profile.repository.js';
import { guideProfileRepository } from '../repositories/guide-profile.repository.js';
import type { UserRepository } from '../repositories/user.repository.js';
import { userRepository } from '../repositories/user.repository.js';

export interface GuideProfileServiceDeps {
  profiles: GuideProfileRepository;
  users: UserRepository;
  storage: MediaStorage;
}

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
    test: (b) => b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
];

const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Persisted image columns — cover and profile photo share the same pipeline. */
type ImageKind = 'cover' | 'profile';
const IMAGE_KIND: Record<
  ImageKind,
  { keyDir: string; urlField: 'coverImage' | 'profileImage'; setUrl: 'setCoverImageUrl' | 'setProfileImageUrl' }
> = {
  cover: { keyDir: 'guide-covers', urlField: 'coverImage', setUrl: 'setCoverImageUrl' },
  profile: { keyDir: 'guide-photos', urlField: 'profileImage', setUrl: 'setProfileImageUrl' },
};

export function createGuideProfileService(deps: GuideProfileServiceDeps) {
  const { profiles, users, storage } = deps;

  async function uploadImage(userId: number, file: Express.Multer.File | undefined, kind: ImageKind) {
    const cfg = IMAGE_KIND[kind];
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

    const previous = await profiles.findByUserId(userId);
    const oldKey = keyFromStoredUrl(previous?.[cfg.urlField]?.url ?? null);

    // Upload first — the old file is only removed after the new one is
    // stored AND the DB row points at it.
    const key = `${cfg.keyDir}/${userId}/${randomUUID()}.${type.ext}`;
    const stored = await storage.put(key, file.buffer, type.mime);
    await profiles[cfg.setUrl](userId, stored.url);

    if (oldKey) await storage.delete(oldKey).catch(() => undefined);

    return stored.url;
  }

  async function removeImage(userId: number, kind: ImageKind) {
    const cfg = IMAGE_KIND[kind];
    const previous = await profiles.findByUserId(userId);
    const oldKey = keyFromStoredUrl(previous?.[cfg.urlField]?.url ?? null);

    await profiles[cfg.setUrl](userId, null);
    if (oldKey) await storage.delete(oldKey).catch(() => undefined);
  }

  return {
    /**
     * Own profile, or a documented empty shell when none exists yet — the
     * form renders immediately and PATCH creates on first save.
     */
    async get(userId: number): Promise<GuideProfileResult> {
      const existing = await profiles.findByUserId(userId);
      if (existing) return existing;

      const user = await users.findById(userId);
      if (!user) throw AppError.notFound('User not found');
      return {
        firstName: user.firstName,
        lastName: user.lastName,
        headline: null,
        bio: null,
        baseCity: null,
        countryCode: null,
        guidingAreas: null,
        languages: null,
        yearsOfExperience: null,
        specialties: null,
        certificationTitle: null,
        tourPreferences: null,
        hourlyRate: null,
        contactPhone: null,
        website: null,
        coverImage: null,
        profileImage: null,
        verificationStatus: 'unverified',
        profileStatus: 'draft',
        updatedAt: null, // profile row doesn't exist yet
      };
    },

    async update(userId: number, patch: GuideProfilePatchInput): Promise<GuideProfileResult> {
      return profiles.upsert(userId, patch);
    },

    async uploadCover(userId: number, file: Express.Multer.File | undefined) {
      const url = await uploadImage(userId, file, 'cover');
      return { coverImage: { url } };
    },

    async deleteCover(userId: number) {
      await removeImage(userId, 'cover');
      return { coverImage: null };
    },

    async uploadProfileImage(userId: number, file: Express.Multer.File | undefined) {
      const url = await uploadImage(userId, file, 'profile');
      return { profileImage: { url } };
    },

    async deleteProfileImage(userId: number) {
      await removeImage(userId, 'profile');
      return { profileImage: null };
    },
  };
}

export type GuideProfileService = ReturnType<typeof createGuideProfileService>;

export const guideProfileService = createGuideProfileService({
  profiles: guideProfileRepository,
  users: userRepository,
  storage: localDiskStorage,
});
