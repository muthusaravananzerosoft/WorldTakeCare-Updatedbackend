import { AppError } from '../common/errors/app-error.js';
import type {
  FeaturedCountryInput,
  FeaturedCountryRecord,
  FeaturedCountryResult,
  FeaturedCountryUpdateInput,
} from '../entities/featured-country.types.js';
import {
  featuredCountryRepository,
  type FeaturedCountryRepository,
} from '../repositories/featured-country.repository.js';
import type { PageRequest } from '../repositories/repository.interface.js';

export interface FeaturedCountryServiceDeps {
  countries: FeaturedCountryRepository;
}

function toResult(record: FeaturedCountryRecord): FeaturedCountryResult {
  return {
    id: record.id,
    countryName: record.countryName,
    countryCode: record.countryCode,
    description: record.description,
    keywords: record.keywords,
    landmarkName: record.landmarkName,
    image: {
      url: record.imageUrl,
      provider: record.imageProvider,
      id: record.imageId,
      sourceUrl: record.imageSourceUrl,
    },
    attribution: {
      photographerName: record.photographerName,
      photographerUrl: record.photographerUrl,
    },
  };
}

export function createFeaturedCountryService(deps: FeaturedCountryServiceDeps) {
  const { countries } = deps;

  return {
    /** Public feed — active countries only, ordered by display_order. */
    async list(request: PageRequest, q?: string) {
      const page = await countries.findPage(request, q);
      return {
        countries: page.items.map(toResult),
        page: page.page,
        limit: page.pageSize,
        total: page.totalItems,
        totalPages: Math.max(1, Math.ceil(page.totalItems / page.pageSize)),
      };
    },

    /** Public detail — 404 for inactive or unknown ids (existence not leaked). */
    async getById(id: number): Promise<FeaturedCountryResult> {
      const record = await countries.findById(id);
      if (!record || !record.isActive) throw AppError.notFound('Country not found');
      return toResult(record);
    },

    async create(input: FeaturedCountryInput): Promise<FeaturedCountryResult> {
      if (await countries.findByCode(input.countryCode)) {
        throw AppError.conflict(`Country ${input.countryCode} already exists`);
      }
      const record = await countries.create(input);
      return toResult(record);
    },

    async update(
      id: number,
      input: FeaturedCountryUpdateInput,
    ): Promise<FeaturedCountryResult> {
      const record = await countries.update(id, input);
      if (!record) throw AppError.notFound('Country not found');
      return toResult(record);
    },

    async delete(id: number): Promise<void> {
      const deleted = await countries.delete(id);
      if (!deleted) throw AppError.notFound('Country not found');
    },
  };
}

export type FeaturedCountryService = ReturnType<typeof createFeaturedCountryService>;

export const featuredCountryService = createFeaturedCountryService({
  countries: featuredCountryRepository,
});
