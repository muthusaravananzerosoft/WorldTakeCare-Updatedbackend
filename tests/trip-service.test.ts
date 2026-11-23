import { describe, expect, it, vi } from 'vitest';
import type {
  CreateTripInput,
  ItineraryDayInput,
  TripRecord,
} from '../src/entities/trip.types.js';
import type { AttractionRepository } from '../src/repositories/attraction.repository.js';
import type { DestinationRepository } from '../src/repositories/destination.repository.js';
import type { TripRepository } from '../src/repositories/trip.repository.js';
import { createTripService, type TripServiceDeps } from '../src/services/trip.service.js';

const maduraiDestination = {
  id: 47,
  kind: 'city' as const,
  name: 'Madurai',
  admin1: 'Tamil Nadu',
  countryCode: 'IN',
  countryName: 'India',
  lat: 9.926,
  lng: 78.114,
  source: 'geoapify',
  sourceId: '1264527',
};

const baseInput: CreateTripInput = {
  destinationId: 47,
  startDate: '2026-12-12',
  endDate: '2026-12-15',
  tripType: 'family',
  interests: ['beaches', 'food', 'culture', 'nature'],
  notes: 'Planning a family vacation',
  accommodation: 'resort',
  dietaryPreferences: ['vegetarian', 'halal'],
  emergencyContact: { name: 'Emergency Contact', phone: '+911234567890' },
  insurance: { provider: 'ABC Insurance', insuranceNumber: 'INS-123456789' },
  budget: { amount: 2300, currency: 'USD' },
  visibility: 'public',
  planMode: 'auto',
};

function tripRecord(overrides: Partial<TripRecord> = {}): TripRecord {
  return {
    id: 1,
    userId: 7,
    destinationId: 47,
    startDate: '2026-12-12',
    endDate: '2026-12-15',
    tripType: 'family',
    interests: ['beaches', 'food', 'culture', 'nature'],
    notes: 'Planning a family vacation',
    accommodation: 'resort',
    dietaryPreferences: ['vegetarian', 'halal'],
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+911234567890',
    insuranceProvider: 'ABC Insurance',
    insuranceNumber: 'INS-123456789',
    budgetAmount: 2300,
    budgetCurrency: 'USD',
    visibility: 'public',
    status: 'planned',
    planMode: 'auto',
    itinerary: null,
    createdAt: '2026-11-19T10:00:00.000Z',
    updatedAt: '2026-11-19T10:00:00.000Z',
    ...overrides,
  };
}

function makeDeps(): TripServiceDeps {
  return {
    trips: {
      create: vi.fn<TripRepository['create']>(async () => tripRecord()),
      findById: vi.fn<TripRepository['findById']>(async () => null),
      listByUser: vi.fn<TripRepository['listByUser']>(async () => []),
      update: vi.fn<TripRepository['update']>(async () => null),
      delete: vi.fn<TripRepository['delete']>(async () => false),
    },
    destinations: {
      findById: vi.fn<DestinationRepository['findById']>(async () => maduraiDestination),
      upsert: vi.fn<DestinationRepository['upsert']>(async () => maduraiDestination),
      setCoordinates: vi.fn<DestinationRepository['setCoordinates']>(async () => {}),
    },
    attractions: {
      listByDestination: vi.fn<AttractionRepository['listByDestination']>(async () => []),
      saveAll: vi.fn<AttractionRepository['saveAll']>(async () => {}),
      listCurated: vi.fn<AttractionRepository['listCurated']>(async () => []),
      findByIds: vi.fn<AttractionRepository['findByIds']>(async () => []),
      findCuratedByIds: vi.fn<AttractionRepository['findCuratedByIds']>(async () => []),
    },
  };
}

describe('tripService.create', () => {
  it('saves the trip for the token user and returns the nested response', async () => {
    const deps = makeDeps();
    const svc = createTripService(deps);

    const res = await svc.create(7, baseInput);

    expect(deps.trips.create).toHaveBeenCalledWith(7, baseInput);
    expect(res).toMatchObject({
      id: 1,
      destinationId: 47,
      tripType: 'family',
      interests: ['beaches', 'food', 'culture', 'nature'],
      dietaryPreferences: ['vegetarian', 'halal'],
      emergencyContact: { name: 'Emergency Contact', phone: '+911234567890' },
      insurance: { provider: 'ABC Insurance', insuranceNumber: 'INS-123456789' },
      budget: { amount: 2300, currency: 'USD' },
      visibility: 'public',
      status: 'planned',
    });
  });

  it('rejects an unknown destinationId before touching the trips table', async () => {
    const deps = makeDeps();
    vi.mocked(deps.destinations.findById).mockResolvedValue(null);
    const svc = createTripService(deps);

    await expect(svc.create(7, baseInput)).rejects.toMatchObject({ statusCode: 400 });
    expect(deps.trips.create).not.toHaveBeenCalled();
  });
});

describe('tripService.getById', () => {
  it('returns the trip to its owner including sensitive fields', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    const svc = createTripService(deps);

    const res = await svc.getById(1, 7);

    expect(res.emergencyContact?.phone).toBe('+911234567890');
    expect(res.insurance?.insuranceNumber).toBe('INS-123456789');
    expect(res.destination?.name).toBe('Madurai');
  });

  it('hides emergency contact and insurance from non-owners of a public trip', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    const svc = createTripService(deps);

    const res = await svc.getById(1, 999);

    expect(res.emergencyContact).toBeNull();
    expect(res.insurance).toBeNull();
  });

  it('returns 404 for a private trip owned by someone else', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord({ visibility: 'private' }));
    const svc = createTripService(deps);

    await expect(svc.getById(1, 999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('returns 404 for an unknown trip', async () => {
    const svc = createTripService(makeDeps());
    await expect(svc.getById(1, 7)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('tripService.update', () => {
  it('lets the owner patch fields', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    vi.mocked(deps.trips.update).mockResolvedValue(
      tripRecord({ notes: 'updated', interests: ['hiking'] }),
    );
    const svc = createTripService(deps);

    const res = await svc.update(1, 7, { notes: 'updated', interests: ['hiking'] });

    expect(deps.trips.update).toHaveBeenCalledWith(1, { notes: 'updated', interests: ['hiking'] });
    expect(res.notes).toBe('updated');
  });

  it('rejects a non-owner before updating', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    const svc = createTripService(deps);

    await expect(svc.update(1, 999, { notes: 'x' })).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.trips.update).not.toHaveBeenCalled();
  });

  it('rejects a date range where the patched endDate precedes startDate', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    const svc = createTripService(deps);

    await expect(svc.update(1, 7, { endDate: '2026-12-01' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

const meenakshi = {
  id: 12,
  destinationId: 47,
  name: 'Meenakshi Temple',
  originalName: null,
  category: 'hindu temple',
  lat: 9.9195,
  lng: 78.1193,
  rate: 0,
  touristRelevance: 85,
  isFeatured: true,
  distanceM: 800,
  source: 'geoapify',
};

const palace = { ...meenakshi, id: 45, name: 'Thirumalai Palace', distanceM: 1647 };

const validItinerary: ItineraryDayInput[] = [
  { day: 1, stops: [{ attractionId: 12, order: 1, time: '09:00' }] },
  { day: 2, stops: [] },
  { day: 3, stops: [{ attractionId: 45, order: 1, note: 'Sunset visit' }] },
];

describe('tripService itinerary', () => {
  it('creates a trip with a valid itinerary and returns enriched stops', async () => {
    const deps = makeDeps();
    vi.mocked(deps.attractions.findByIds).mockResolvedValue([meenakshi, palace]);
    vi.mocked(deps.trips.create).mockResolvedValue(tripRecord({ itinerary: validItinerary }));
    const svc = createTripService(deps);

    const res = await svc.create(7, { ...baseInput, itinerary: validItinerary });

    expect(deps.trips.create).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ itinerary: validItinerary }),
    );
    expect(res.itinerary).toHaveLength(3);
    expect(res.itinerary?.[0]?.stops[0]?.attraction?.name).toBe('Meenakshi Temple');
    expect(res.itinerary?.[0]?.stops[0]?.attraction?.distanceM).toBe(800);
    expect(res.itinerary?.[1]?.stops).toEqual([]);
  });

  it('rejects a day number beyond the trip length', async () => {
    const deps = makeDeps();
    const svc = createTripService(deps);
    const bad: ItineraryDayInput[] = [{ day: 5, stops: [] }]; // trip is 4 days

    await expect(
      svc.create(7, { ...baseInput, itinerary: bad }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(deps.trips.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown attractionId', async () => {
    const deps = makeDeps();
    vi.mocked(deps.attractions.findByIds).mockResolvedValue([meenakshi]);
    const svc = createTripService(deps);

    await expect(
      svc.create(7, { ...baseInput, itinerary: validItinerary }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an attraction belonging to a different destination', async () => {
    const deps = makeDeps();
    vi.mocked(deps.attractions.findByIds).mockResolvedValue([
      meenakshi,
      { ...palace, destinationId: 999 },
    ]);
    const svc = createTripService(deps);

    await expect(
      svc.create(7, { ...baseInput, itinerary: validItinerary }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('accepts a curated attraction for the same city', async () => {
    const deps = makeDeps();
    vi.mocked(deps.attractions.findByIds).mockResolvedValue([meenakshi]);
    vi.mocked(deps.attractions.findCuratedByIds).mockResolvedValue([
      {
        id: 45,
        name: 'Azhagar Kovil',
        originalName: null,
        category: 'hindu temple',
        lat: 10.074,
        lng: 78.213,
        city: 'Madurai',
        admin1: 'Tamil Nadu',
        countryCode: 'IN',
      },
    ]);
    vi.mocked(deps.trips.create).mockResolvedValue(tripRecord({ itinerary: validItinerary }));
    const svc = createTripService(deps);

    const res = await svc.create(7, { ...baseInput, itinerary: validItinerary });
    expect(res.itinerary?.[2]?.stops[0]?.attraction?.name).toBe('Azhagar Kovil');
    expect(res.itinerary?.[2]?.stops[0]?.attraction?.source).toBe('curated');
  });

  it('replaces the itinerary on PATCH and validates against effective dates', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    vi.mocked(deps.attractions.findByIds).mockResolvedValue([meenakshi]);
    vi.mocked(deps.trips.update).mockResolvedValue(
      tripRecord({ itinerary: [{ day: 1, stops: [{ attractionId: 12, order: 1 }] }] }),
    );
    const svc = createTripService(deps);
    const newPlan: ItineraryDayInput[] = [
      { day: 1, stops: [{ attractionId: 12, order: 1 }] },
    ];

    const res = await svc.update(1, 7, { itinerary: newPlan });

    expect(deps.trips.update).toHaveBeenCalledWith(1, { itinerary: newPlan });
    expect(res.itinerary?.[0]?.stops[0]?.attraction?.id).toBe(12);
  });

  it('rejects a PATCH whose itinerary exceeds the stored trip length', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    const svc = createTripService(deps);

    await expect(
      svc.update(1, 7, { itinerary: [{ day: 9, stops: [] }] }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(deps.trips.update).not.toHaveBeenCalled();
  });

  it('saves planMode alongside the itinerary on PATCH', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    vi.mocked(deps.trips.update).mockResolvedValue(
      tripRecord({ planMode: 'manual', itinerary: [{ day: 1, stops: [] }] }),
    );
    const svc = createTripService(deps);

    const res = await svc.update(1, 7, { planMode: 'manual', itinerary: [{ day: 1, stops: [] }] });

    expect(deps.trips.update).toHaveBeenCalledWith(
      1,
      { planMode: 'manual', itinerary: [{ day: 1, stops: [] }] },
    );
    expect(res.planMode).toBe('manual');
  });

  it('rejects a non-owner itinerary update', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    const svc = createTripService(deps);

    await expect(
      svc.update(1, 999, { itinerary: [{ day: 1, stops: [] }] }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.trips.update).not.toHaveBeenCalled();
  });
});

describe('tripService.delete', () => {
  it('deletes the owner trip', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    const svc = createTripService(deps);

    await svc.delete(1, 7);

    expect(deps.trips.delete).toHaveBeenCalledWith(1);
  });

  it('rejects a non-owner', async () => {
    const deps = makeDeps();
    vi.mocked(deps.trips.findById).mockResolvedValue(tripRecord());
    const svc = createTripService(deps);

    await expect(svc.delete(1, 999)).rejects.toMatchObject({ statusCode: 404 });
    expect(deps.trips.delete).not.toHaveBeenCalled();
  });
});
