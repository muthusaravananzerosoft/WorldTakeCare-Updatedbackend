import { describe, expect, it, vi } from 'vitest';
import type {
  FeaturedCountryInput,
  FeaturedCountryRecord,
} from '../src/entities/featured-country.types.js';
import type { FeaturedCountryRepository } from '../src/repositories/featured-country.repository.js';
import type { Page, PageRequest } from '../src/repositories/repository.interface.js';
import {
  createFeaturedCountryService,
  type FeaturedCountryServiceDeps,
} from '../src/services/featured-country.service.js';

function record(overrides: Partial<FeaturedCountryRecord> = {}): FeaturedCountryRecord {
  return {
    id: 1,
    countryName: 'France',
    countryCode: 'FR',
    description: 'Discover romantic cities, iconic landmarks, art and beautiful countryside.',
    keywords: ['Architecture', 'Foodie', 'Museums'],
    landmarkName: 'Eiffel Tower',
    imageUrl: 'https://images.unsplash.com/photo-x',
    imageProvider: 'unsplash',
    imageId: 'abc123',
    photographerName: 'Jane Doe',
    photographerUrl: 'https://unsplash.com/@janedoe?utm_source=worldtaker',
    imageSourceUrl: 'https://unsplash.com/photos/abc123?utm_source=worldtaker',
    displayOrder: 1,
    isActive: true,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    ...overrides,
  };
}

const input: FeaturedCountryInput = {
  countryName: 'France',
  countryCode: 'FR',
  description: 'Discover romantic cities, iconic landmarks, art and beautiful countryside.',
  keywords: ['Architecture', 'Foodie', 'Museums'],
  landmarkName: 'Eiffel Tower',
  imageUrl: 'https://images.unsplash.com/photo-x',
  imageProvider: 'unsplash',
  imageId: 'abc123',
  photographerName: 'Jane Doe',
  photographerUrl: 'https://unsplash.com/@janedoe',
  imageSourceUrl: 'https://unsplash.com/photos/abc123',
  displayOrder: 1,
  isActive: true,
};

function makeDeps(): FeaturedCountryServiceDeps {
  return {
    countries: {
      create: vi.fn<FeaturedCountryRepository['create']>(async () => record()),
      upsertByCode: vi.fn<FeaturedCountryRepository['upsertByCode']>(async () => record()),
      findById: vi.fn<FeaturedCountryRepository['findById']>(async () => null),
      findByCode: vi.fn<FeaturedCountryRepository['findByCode']>(async () => null),
      findPage: vi.fn<FeaturedCountryRepository['findPage']>(
        async (r: PageRequest): Promise<Page<FeaturedCountryRecord>> => ({
          items: [],
          page: r.page,
          pageSize: r.pageSize,
          totalItems: 0,
        }),
      ),
      update: vi.fn<FeaturedCountryRepository['update']>(async () => null),
      delete: vi.fn<FeaturedCountryRepository['delete']>(async () => false),
    },
  };
}

describe('featuredCountryService.list', () => {
  it('maps the page and forwards the search query', async () => {
    const deps = makeDeps();
    vi.mocked(deps.countries.findPage).mockResolvedValue({
      items: [record()],
      page: 1,
      pageSize: 10,
      totalItems: 1,
    });
    const svc = createFeaturedCountryService(deps);

    const res = await svc.list({ page: 1, pageSize: 10 }, 'fra');

    expect(deps.countries.findPage).toHaveBeenCalledWith({ page: 1, pageSize: 10 }, 'fra');
    expect(res.countries[0]?.countryName).toBe('France');
    expect(res.countries[0]?.image.provider).toBe('unsplash');
    expect(res.countries[0]?.attribution.photographerName).toBe('Jane Doe');
    expect(res.totalPages).toBe(1);
  });
});

describe('featuredCountryService.getById', () => {
  it('returns an active country', async () => {
    const deps = makeDeps();
    vi.mocked(deps.countries.findById).mockResolvedValue(record());
    const res = await createFeaturedCountryService(deps).getById(1);
    expect(res.countryCode).toBe('FR');
    expect(res.keywords).toHaveLength(3);
  });

  it('404s on inactive countries (existence not leaked)', async () => {
    const deps = makeDeps();
    vi.mocked(deps.countries.findById).mockResolvedValue(record({ isActive: false }));
    await expect(createFeaturedCountryService(deps).getById(1)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('404s on unknown ids', async () => {
    await expect(createFeaturedCountryService(makeDeps()).getById(9)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('featuredCountryService.create', () => {
  it('creates a new country', async () => {
    const deps = makeDeps();
    const svc = createFeaturedCountryService(deps);
    const res = await svc.create(input);
    expect(deps.countries.create).toHaveBeenCalledWith(input);
    expect(res.countryName).toBe('France');
  });

  it('rejects a duplicate country code', async () => {
    const deps = makeDeps();
    vi.mocked(deps.countries.findByCode).mockResolvedValue(record());
    const svc = createFeaturedCountryService(deps);
    await expect(svc.create(input)).rejects.toMatchObject({ statusCode: 409 });
    expect(deps.countries.create).not.toHaveBeenCalled();
  });
});

describe('featuredCountryService.update/delete', () => {
  it('updates and returns the record', async () => {
    const deps = makeDeps();
    vi.mocked(deps.countries.update).mockResolvedValue(record({ isActive: false }));
    const res = await createFeaturedCountryService(deps).update(1, { isActive: false });
    expect(deps.countries.update).toHaveBeenCalledWith(1, { isActive: false });
    expect(res.id).toBe(1);
  });

  it('404s when updating an unknown id', async () => {
    await expect(
      createFeaturedCountryService(makeDeps()).update(9, { description: 'x' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deletes an existing country', async () => {
    const deps = makeDeps();
    vi.mocked(deps.countries.delete).mockResolvedValue(true);
    await createFeaturedCountryService(deps).delete(1);
    expect(deps.countries.delete).toHaveBeenCalledWith(1);
  });

  it('404s when deleting an unknown id', async () => {
    await expect(createFeaturedCountryService(makeDeps()).delete(9)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
