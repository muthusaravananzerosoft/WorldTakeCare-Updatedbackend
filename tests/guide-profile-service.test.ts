import { describe, expect, it, vi } from 'vitest';
import type { GuideProfileResult } from '../src/entities/guide-profile.types.js';
import type { UserRecord } from '../src/entities/auth.types.js';
import type { MediaStorage, StoredObject } from '../src/integrations/storage/media-storage.interface.js';
import type { GuideProfileRepository } from '../src/repositories/guide-profile.repository.js';
import { createGuideProfileService, type GuideProfileServiceDeps } from '../src/services/guide-profile.service.js';
import { updateGuideProfileBodySchema } from '../src/validators/guide-profile.validation.js';

function profileResult(overrides: Partial<GuideProfileResult> = {}): GuideProfileResult {
  return {
    firstName: 'Made',
    lastName: 'Wardana',
    headline: 'Local storyteller',
    bio: 'I help travelers explore.',
    baseCity: 'Ubud',
    countryCode: 'ID',
    guidingAreas: ['Ubud'],
    languages: ['English', 'Indonesian'],
    yearsOfExperience: 5,
    specialties: ['Culture & History'],
    certificationTitle: 'Certified regional guide',
    tourPreferences: { privateTours: true, maxGroupSize: 8 },
    hourlyRate: { amount: 25, currency: 'USD' },
    contactPhone: '+628123456789',
    website: 'https://example.com',
    coverImage: null,
    profileImage: null,
    verificationStatus: 'unverified',
    profileStatus: 'draft',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

function makeDeps(): GuideProfileServiceDeps {
  return {
    profiles: {
      findByUserId: vi.fn<GuideProfileRepository['findByUserId']>(async () => profileResult()),
      upsert: vi.fn<GuideProfileRepository['upsert']>(async (_u, p) =>
        profileResult({ headline: p.headline === undefined ? 'Local storyteller' : p.headline }),
      ),
      setCoverImageUrl: vi.fn(async () => undefined),
      setProfileImageUrl: vi.fn(async () => undefined),
      setProfileStatus: vi.fn(async () => undefined),
      findPublicPage: vi.fn(async (_f, r) => ({
        items: [],
        page: r.page,
        pageSize: r.pageSize,
        totalItems: 0,
      })),
      findPublicById: vi.fn(async () => null),
    },
    users: {
      findByEmail: vi.fn(async () => null),
      findById: vi.fn(async (): Promise<UserRecord> => ({
        id: 25,
        email: 'g@x.com',
        passwordHash: 'h',
        firstName: 'Made',
        lastName: 'Wardana',
        role: 'guide',
        status: 'active',
      })),
      findCountryIdByCode: vi.fn(async () => null),
      create: vi.fn(),
      setActive: vi.fn(),
      updatePassword: vi.fn(),
      touchLastLogin: vi.fn(),
    },
    storage: {
      put: vi.fn<MediaStorage['put']>(async (key, data, contentType): Promise<StoredObject> => ({
        key,
        url: `http://localhost:4000/uploads/${key}`,
        contentType,
        sizeBytes: data.length,
      })),
      delete: vi.fn(async () => undefined),
      getUrl: vi.fn((key) => `/uploads/${key}`),
    },
  };
}

describe('guideProfileService.get', () => {
  it('returns the stored profile', async () => {
    const svc = createGuideProfileService(makeDeps());
    const res = await svc.get(25);
    expect(res.headline).toBe('Local storyteller');
  });

  it('returns an empty shell with account names when no profile exists', async () => {
    const deps = makeDeps();
    vi.mocked(deps.profiles.findByUserId).mockResolvedValue(null);
    const svc = createGuideProfileService(deps);

    const res = await svc.get(25);
    expect(res).toMatchObject({
      firstName: 'Made',
      lastName: 'Wardana',
      headline: null,
      coverImage: null,
      verificationStatus: 'unverified',
      profileStatus: 'draft',
      updatedAt: null,
    });
  });
});

describe('guideProfileService.update', () => {
  it('forwards the patch to the repository upsert', async () => {
    const deps = makeDeps();
    const svc = createGuideProfileService(deps);

    await svc.update(25, { firstName: 'Kadek', languages: ['English'], bio: null });

    expect(deps.profiles.upsert).toHaveBeenCalledWith(25, {
      firstName: 'Kadek',
      languages: ['English'],
      bio: null,
    });
  });
});

describe('guideProfileService.uploadCover', () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
  ]);
  const file = (mimetype: string, buffer: Buffer, size = buffer.length): Express.Multer.File =>
    ({ mimetype, buffer, size }) as Express.Multer.File;

  it('rejects a missing file', async () => {
    const svc = createGuideProfileService(makeDeps());
    await expect(svc.uploadCover(25, undefined)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a file over 2 MB', async () => {
    const svc = createGuideProfileService(makeDeps());
    await expect(
      svc.uploadCover(25, file('image/png', png, 3 * 1024 * 1024)),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects fake content — PNG header declared on garbage bytes', async () => {
    const svc = createGuideProfileService(makeDeps());
    await expect(
      svc.uploadCover(25, file('image/png', Buffer.from('not an image'))),
    ).rejects.toMatchObject({ statusCode: 415 });
  });

  it('stores the image and persists the URL; deletes the old cover after', async () => {
    const deps = makeDeps();
    vi.mocked(deps.profiles.findByUserId).mockResolvedValue(
      profileResult({ coverImage: { url: 'http://localhost:4000/uploads/guide-covers/25/old.png' } }),
    );
    const svc = createGuideProfileService(deps);

    const res = await svc.uploadCover(25, file('image/png', png));

    expect(deps.storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^guide-covers\/25\/.+\.png$/),
      png,
      'image/png',
    );
    expect(deps.profiles.setCoverImageUrl).toHaveBeenCalledWith(25, res.coverImage.url);
    expect(deps.storage.delete).toHaveBeenCalledWith('guide-covers/25/old.png');
  });
});

describe('guideProfileService.uploadProfileImage', () => {
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4, 1), Buffer.from('WEBP'), Buffer.alloc(64)]);
  const file = (mimetype: string, buffer: Buffer): Express.Multer.File =>
    ({ mimetype, buffer, size: buffer.length }) as Express.Multer.File;

  it('stores the photo under guide-photos and persists the URL', async () => {
    const deps = makeDeps();
    const svc = createGuideProfileService(deps);

    const res = await svc.uploadProfileImage(25, file('image/webp', webp));

    expect(deps.storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^guide-photos\/25\/.+\.webp$/),
      webp,
      'image/webp',
    );
    expect(deps.profiles.setProfileImageUrl).toHaveBeenCalledWith(25, res.profileImage.url);
  });

  it('remove clears the column and deletes the stored file', async () => {
    const deps = makeDeps();
    vi.mocked(deps.profiles.findByUserId).mockResolvedValue(
      profileResult({ profileImage: { url: 'http://localhost:4000/uploads/guide-photos/25/p.webp' } }),
    );
    const svc = createGuideProfileService(deps);

    const res = await svc.deleteProfileImage(25);

    expect(res.profileImage).toBeNull();
    expect(deps.profiles.setProfileImageUrl).toHaveBeenCalledWith(25, null);
    expect(deps.storage.delete).toHaveBeenCalledWith('guide-photos/25/p.webp');
  });
});

describe('guideProfileService.deleteCover', () => {
  it('clears the column and deletes the stored file', async () => {
    const deps = makeDeps();
    vi.mocked(deps.profiles.findByUserId).mockResolvedValue(
      profileResult({ coverImage: { url: 'http://localhost:4000/uploads/guide-covers/25/x.webp' } }),
    );
    const svc = createGuideProfileService(deps);

    const res = await svc.deleteCover(25);

    expect(res.coverImage).toBeNull();
    expect(deps.profiles.setCoverImageUrl).toHaveBeenCalledWith(25, null);
    expect(deps.storage.delete).toHaveBeenCalledWith('guide-covers/25/x.webp');
  });
});

describe('guideProfileService.listPublic / getPublicById', () => {
  it('returns an empty page when nothing matches', async () => {
    const svc = createGuideProfileService(makeDeps());
    const res = await svc.listPublic({ sort: 'recommended' }, { page: 1, pageSize: 12 });
    expect(res).toEqual({ guides: [], page: 1, limit: 12, total: 0, totalPages: 0 });
  });

  it('404s on a draft/suspended/missing guide', async () => {
    const svc = createGuideProfileService(makeDeps());
    await expect(svc.getPublicById(25)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns the published guide detail', async () => {
    const deps = makeDeps();
    vi.mocked(deps.profiles.findPublicById).mockResolvedValue({
      id: 25,
      firstName: 'Made',
      lastName: 'Wardana',
      headline: 'Guide',
      baseCity: 'Ubud',
      countryCode: 'ID',
      countryName: 'Indonesia',
      languages: ['English'],
      yearsOfExperience: 5,
      specialties: ['Culture'],
      hourlyRate: { amount: 25, currency: 'USD' },
      maxGroupSize: 8,
      profileImage: null,
      coverImage: null,
      verificationStatus: 'unverified',
      rating: null,
      reviewCount: 0,
      bio: 'bio',
      guidingAreas: ['Ubud'],
      certificationTitle: 'Cert',
      tourPreferences: { privateTours: true },
    });
    const svc = createGuideProfileService(deps);
    const res = await svc.getPublicById(25);
    expect(res.id).toBe(25);
    expect(res.rating).toBeNull();
    expect(res.reviewCount).toBe(0);
  });
});

describe('guideProfileService.publish', () => {
  it('404s when no profile exists', async () => {
    const deps = makeDeps();
    vi.mocked(deps.profiles.findByUserId).mockResolvedValue(null);
    const svc = createGuideProfileService(deps);
    await expect(svc.publish(25)).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.profiles.setProfileStatus).not.toHaveBeenCalled();
  });

  it('rejects publishing an incomplete profile with the missing list', async () => {
    const deps = makeDeps();
    vi.mocked(deps.profiles.findByUserId).mockResolvedValue(
      profileResult({ bio: null, languages: null, profileImage: null }),
    );
    const svc = createGuideProfileService(deps);
    await expect(svc.publish(25)).rejects.toMatchObject({
      statusCode: 400,
      details: { missing: expect.arrayContaining(['bio', 'languages', 'profileImage']) },
    });
    expect(deps.profiles.setProfileStatus).not.toHaveBeenCalled();
  });

  it('publishes a complete profile and returns it', async () => {
    const deps = makeDeps();
    const complete = profileResult({
      profileImage: { url: 'http://localhost:4000/uploads/guide-photos/25/x.png' },
    });
    vi.mocked(deps.profiles.findByUserId)
      .mockResolvedValueOnce(complete)
      .mockResolvedValueOnce({ ...complete, profileStatus: 'published' });
    const svc = createGuideProfileService(deps);

    const res = await svc.publish(25);
    expect(deps.profiles.setProfileStatus).toHaveBeenCalledWith(25, 'published');
    expect(res.profileStatus).toBe('published');
  });
});

describe('updateGuideProfileBodySchema', () => {
  it('trims, dedupes case-insensitively and caps languages at 20', () => {
    const ok = updateGuideProfileBodySchema.parse({
      languages: [' English ', 'english', 'Indonesian'],
    });
    expect(ok.languages).toEqual(['English', 'Indonesian']);

    const tooMany = updateGuideProfileBodySchema.safeParse({
      languages: Array.from({ length: 21 }, (_, i) => `l${i}`),
    });
    expect(tooMany.success).toBe(false);
  });

  it('rejects restricted fields like verificationStatus', () => {
    const res = updateGuideProfileBodySchema.safeParse({ verificationStatus: 'verified' });
    expect(res.success).toBe(false);
  });

  it('accepts null to clear and validates nested objects', () => {
    const res = updateGuideProfileBodySchema.parse({
      bio: null,
      hourlyRate: { amount: 25, currency: 'usd' },
      tourPreferences: { privateTours: true, maxGroupSize: 8 },
    });
    expect(res.bio).toBeNull();
    expect(res.hourlyRate).toEqual({ amount: 25, currency: 'USD' });
  });
});
