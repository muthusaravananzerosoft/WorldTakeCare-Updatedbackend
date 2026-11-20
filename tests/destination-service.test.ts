import { describe, expect, it, vi } from 'vitest';
import type { DestinationRecord } from '../src/entities/destination.types.js';
import type {
  AttractionsProvider,
  GeoSearchProvider,
} from '../src/integrations/places/places-provider.interface.js';
import type { AttractionRepository } from '../src/repositories/attraction.repository.js';
import type { DestinationRepository } from '../src/repositories/destination.repository.js';
import type { LocationHit, LocationRepository } from '../src/repositories/location.repository.js';
import {
  createDestinationService,
  type DestinationServiceDeps,
} from '../src/services/destination.service.js';

const maduraiHit: LocationHit = {
  kind: 'city',
  legacyId: 42,
  name: 'Madurai',
  admin1: 'Tamil Nadu',
  countryCode: 'IN',
  countryName: 'India',
};

function makeDeps(): DestinationServiceDeps {
  let nextId = 1;
  return {
    locations: { search: vi.fn<LocationRepository['search']>(async () => []) },
    destinations: {
      findById: vi.fn<DestinationRepository['findById']>(async () => null),
      upsert: vi.fn<DestinationRepository['upsert']>(async (input) => ({
        id: nextId++,
        ...input,
      })),
      setCoordinates: vi.fn<DestinationRepository['setCoordinates']>(async () => {}),
    },
    attractions: {
      listByDestination: vi.fn<AttractionRepository['listByDestination']>(async () => []),
      saveAll: vi.fn<AttractionRepository['saveAll']>(async () => {}),
      listCurated: vi.fn<AttractionRepository['listCurated']>(async () => []),
      findByIds: vi.fn<AttractionRepository['findByIds']>(async () => []),
      findCuratedByIds: vi.fn<AttractionRepository['findCuratedByIds']>(async () => []),
    },
    geoSearch: {
      geocode: vi.fn<GeoSearchProvider['geocode']>(async () => null),
      search: vi.fn<GeoSearchProvider['search']>(async () => []),
    },
    attractionSource: {
      findAttractions: vi.fn<AttractionsProvider['findAttractions']>(async () => []),
    },
    sourceName: 'geoapify',
  };
}

const baseInput = { q: 'madu', limit: 10 };

describe('destinationService.search', () => {
  it('materialises local hits and returns them when the provider has nothing better', async () => {
    const deps = makeDeps();
    vi.mocked(deps.locations.search).mockResolvedValue([maduraiHit]);
    const svc = createDestinationService(deps);

    const res = await svc.search({ ...baseInput, limit: 1 });

    expect(deps.locations.search).toHaveBeenCalledWith('madu', 1);
    expect(deps.destinations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'city', source: 'legacy', sourceId: '42' }),
    );
    expect(res.results).toEqual([
      expect.objectContaining({ name: 'Madurai', admin1: 'Tamil Nadu', countryCode: 'IN' }),
    ]);
  });

  it('ranks a famous external hit above obscure local namesakes', async () => {
    const deps = makeDeps();
    // 10 US towns named "Paris" fill the local table; Paris, France must
    // still surface on top via provider importance.
    vi.mocked(deps.locations.search).mockResolvedValue(
      ['Arkansas', 'Texas', 'Illinois'].map((state, i) => ({
        kind: 'city' as const,
        legacyId: i + 1,
        name: 'Paris',
        admin1: state,
        countryCode: 'US',
        countryName: 'USA',
      })),
    );
    vi.mocked(deps.geoSearch.search).mockResolvedValue([
      {
        sourceId: 'g-paris',
        name: 'Paris',
        admin1: 'Ile-de-France',
        countryCode: 'FR',
        countryName: 'France',
        lat: 48.85,
        lng: 2.35,
        kind: 'city',
        importance: 0.897,
      },
      {
        sourceId: 'g-paris-tx',
        name: 'Paris',
        admin1: 'Texas',
        countryCode: 'US',
        countryName: 'United States',
        lat: 33.66,
        lng: -95.55,
        kind: 'city',
        importance: 0.31,
      },
    ]);
    const svc = createDestinationService(deps);

    const res = await svc.search({ q: 'paris', limit: 5, kind: 'city' });

    expect(res.results[0]).toEqual(
      expect.objectContaining({ name: 'Paris', countryCode: 'FR' }),
    );
    // The Texas external hit dedupes onto the local Paris, Texas row —
    // its importance transfers instead of duplicating the result.
    const texan = res.results.find((r) => r.admin1 === 'Texas');
    expect(res.results.indexOf(texan!)).toBe(1);
    expect(deps.destinations.setCoordinates).toHaveBeenCalledWith(2, 33.66, -95.55);
  });

  it('falls back to external geo search when local data has no hit', async () => {
    const deps = makeDeps();
    vi.mocked(deps.geoSearch.search).mockResolvedValue([
      {
        sourceId: '1264527',
        name: 'Madurai',
        admin1: 'Tamil Nadu',
        countryCode: 'IN',
        countryName: 'India',
        lat: 9.9252,
        lng: 78.1198,
        kind: 'city',
      },
    ]);
    const svc = createDestinationService(deps);

    const res = await svc.search(baseInput);

    expect(deps.geoSearch.search).toHaveBeenCalledWith('madu', 10);
    expect(deps.destinations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'city', source: 'geoapify', sourceId: '1264527' }),
    );
    expect(res.results).toEqual([expect.objectContaining({ name: 'Madurai', lat: 9.9252 })]);
  });

  it('does not duplicate an external result already found locally', async () => {
    const deps = makeDeps();
    vi.mocked(deps.locations.search).mockResolvedValue([maduraiHit]);
    vi.mocked(deps.geoSearch.search).mockResolvedValue([
      {
        sourceId: 'g1',
        name: 'madurai',
        admin1: null,
        countryCode: 'IN',
        countryName: null,
        lat: 9.9,
        lng: 78.1,
        kind: 'city',
      },
      {
        sourceId: 'g2',
        name: 'Madhubani',
        admin1: 'Bihar',
        countryCode: 'IN',
        countryName: 'India',
        lat: 26.35,
        lng: 86.07,
        kind: 'city',
      },
    ]);
    const svc = createDestinationService(deps);

    const res = await svc.search(baseInput);

    // External 'madurai' is dropped as a duplicate of the local hit;
    // 'Madhubani' is materialised → 2 upserts total, 2 results.
    expect(deps.destinations.upsert).toHaveBeenCalledTimes(2);
    expect(res.results.map((r) => r.name)).toEqual(['Madurai', 'Madhubani']);
  });
});

describe('destinationService.getById', () => {
  it('returns 404-shaped AppError for an unknown id', async () => {
    const deps = makeDeps();
    vi.mocked(deps.destinations.findById).mockResolvedValue(null);
    const svc = createDestinationService(deps);

    await expect(svc.getById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('resolves and stores coordinates lazily for legacy rows without them', async () => {
    const deps = makeDeps();
    const row: DestinationRecord = {
      id: 7,
      kind: 'city',
      name: 'Madurai',
      admin1: 'Tamil Nadu',
      countryCode: 'IN',
      countryName: 'India',
      lat: null,
      lng: null,
      source: 'legacy',
      sourceId: '42',
    };
    vi.mocked(deps.destinations.findById).mockResolvedValue(row);
    vi.mocked(deps.geoSearch.geocode).mockResolvedValue({
      sourceId: 'g1',
      name: 'Madurai',
      admin1: null,
      countryCode: 'IN',
      countryName: null,
      lat: 9.9252,
      lng: 78.1198,
    });
    const svc = createDestinationService(deps);

    const result = await svc.getById(7);

    expect(deps.geoSearch.geocode).toHaveBeenCalledWith('Madurai, Tamil Nadu, India');
    expect(deps.destinations.setCoordinates).toHaveBeenCalledWith(7, 9.9252, 78.1198);
    expect(result.lat).toBe(9.9252);
  });
});

describe('destinationService.getAttractions', () => {
  const located: DestinationRecord = {
    id: 7,
    kind: 'place',
    name: 'Madurai',
    admin1: null,
    countryCode: 'IN',
    countryName: 'India',
    lat: 9.9252,
    lng: 78.1198,
    source: 'geoapify',
    sourceId: '1264527',
  };

  it('serves the cache without calling the provider', async () => {
    const deps = makeDeps();
    vi.mocked(deps.destinations.findById).mockResolvedValue(located);
    vi.mocked(deps.attractions.listByDestination).mockResolvedValue([
      {
        id: 1,
        destinationId: 7,
        name: 'Meenakshi Amman Temple',
        originalName: null,
        category: 'place of worship',
        lat: 9.9195,
        lng: 78.1194,
        rate: 0,
        touristRelevance: 40,
        isFeatured: false,
        distanceM: 800,
        source: 'geoapify',
      },
    ]);
    const svc = createDestinationService(deps);

    const res = await svc.getAttractions(7, { limit: 20, radiusKm: 15 });

    expect(deps.attractionSource.findAttractions).not.toHaveBeenCalled();
    expect(res.attractions).toEqual([
      expect.objectContaining({ name: 'Meenakshi Amman Temple', dayTrip: false }),
    ]);
  });

  it('fetches and caches on a cache miss', async () => {
    const deps = makeDeps();
    vi.mocked(deps.destinations.findById).mockResolvedValue(located);
    vi.mocked(deps.attractions.listByDestination)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 1,
          destinationId: 7,
          name: 'Thirumalai Nayakkar Palace',
          originalName: null,
          category: 'castle',
          lat: 9.9145,
          lng: 78.1236,
          rate: 0,
          touristRelevance: 82,
          isFeatured: false,
          distanceM: 1200,
          source: 'geoapify',
        },
      ]);
    vi.mocked(deps.attractionSource.findAttractions).mockResolvedValue([
      {
        sourceId: 'W123',
        name: 'Thirumalai Nayakkar Palace',
        originalName: null,
        category: 'castle',
        lat: 9.9145,
        lng: 78.1236,
        rate: 0,
        touristRelevance: 82,
        distanceM: 1200,
      },
    ]);
    const svc = createDestinationService(deps);

    const res = await svc.getAttractions(7, { limit: 20, radiusKm: 15 });

    expect(deps.attractionSource.findAttractions).toHaveBeenCalledWith({
      lat: 9.9252,
      lng: 78.1198,
      radiusM: 15000,
      limit: 20,
    });
    expect(deps.attractions.saveAll).toHaveBeenCalledWith(
      7,
      [expect.objectContaining({ sourceId: 'W123' })],
      'geoapify',
    );
    expect(res.attractions[0]?.name).toBe('Thirumalai Nayakkar Palace');
  });

  it('merges curated spots: dedupes provider rows, features them, sorts by relevance', async () => {
    const deps = makeDeps();
    vi.mocked(deps.destinations.findById).mockResolvedValue(located);
    vi.mocked(deps.attractions.listByDestination).mockResolvedValue([
      {
        id: 1,
        destinationId: 7,
        name: 'Meenakshi Amman Temple',
        originalName: null,
        category: 'place of worship',
        lat: 9.9195,
        lng: 78.1188,
        rate: 0,
        touristRelevance: 40,
        isFeatured: false,
        distanceM: 700,
        source: 'geoapify',
      },
      {
        id: 2,
        destinationId: 7,
        name: 'Random Local Chapel',
        originalName: null,
        category: 'place of worship',
        lat: 9.926,
        lng: 78.12,
        rate: 0,
        touristRelevance: 40,
        isFeatured: false,
        distanceM: 100,
        source: 'geoapify',
      },
    ]);
    vi.mocked(deps.attractions.listCurated).mockResolvedValue([
      {
        id: 101,
        name: 'Meenakshi Amman Temple',
        originalName: null,
        category: 'hindu temple',
        lat: 9.9195,
        lng: 78.1188,
        city: 'Madurai',
        admin1: 'Tamil Nadu',
        countryCode: 'IN',
      },
      {
        id: 102,
        name: 'Azhagar Kovil',
        originalName: null,
        category: 'hindu temple',
        lat: 10.0742,
        lng: 78.213,
        city: 'Madurai',
        admin1: 'Tamil Nadu',
        countryCode: 'IN',
      },
    ]);
    const svc = createDestinationService(deps);

    const res = await svc.getAttractions(7, { limit: 20, radiusKm: 15 });

    const names = res.attractions.map((a) => a.name);
    // Meenakshi once (merged+featured), Azhagar appended (city match, dayTrip), chapel last.
    expect(names).toEqual(['Meenakshi Amman Temple', 'Azhagar Kovil', 'Random Local Chapel']);
    const meenakshi = res.attractions[0]!;
    expect(meenakshi.isFeatured).toBe(true);
    expect(meenakshi.touristRelevance).toBe(90);
    expect(meenakshi.source).toBe('geoapify');
    const azhagar = res.attractions[1]!;
    expect(azhagar.source).toBe('curated');
    expect(azhagar.dayTrip).toBe(true); // ~20km away
    expect(azhagar.id).toBe(102);
  });

  it('returns an empty list when coordinates can not be resolved', async () => {
    const deps = makeDeps();
    vi.mocked(deps.destinations.findById).mockResolvedValue({ ...located, lat: null, lng: null });
    const svc = createDestinationService(deps);

    const res = await svc.getAttractions(7, { limit: 20, radiusKm: 15 });

    expect(deps.attractionSource.findAttractions).not.toHaveBeenCalled();
    expect(res.attractions).toEqual([]);
  });
});
