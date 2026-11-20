import { AppError } from '../common/errors/app-error.js';
import { haversineM } from '../common/utils/geo.js';
import type { DestinationRecord } from '../entities/destination.types.js';
import type {
  CreateTripInput,
  ItineraryDay,
  ItineraryDayInput,
  ItineraryStop,
  TripRecord,
  TripResult,
  UpdateTripInput,
} from '../entities/trip.types.js';
import {
  attractionRepository,
  type AttractionRepository,
} from '../repositories/attraction.repository.js';
import {
  destinationRepository,
  type DestinationRepository,
} from '../repositories/destination.repository.js';
import { tripRepository, type TripRepository } from '../repositories/trip.repository.js';

export interface TripServiceDeps {
  trips: TripRepository;
  destinations: DestinationRepository;
  attractions: AttractionRepository;
}

const DAY_MS = 86_400_000;
/**
 * Curated rows have no destination_id — they belong when they match the
 * destination city or sit within day-trip range of it (mirrors the curated
 * merge rule in destination.service, with a generous 150 km cap).
 */
const CURATED_ITINERARY_RADIUS_M = 150_000;

interface ResolvedAttraction {
  details: NonNullable<ItineraryStop['attraction']>;
  /** Set for cached `attractions` rows — the authoritative membership check. */
  destinationId: number | null;
  lat: number;
  lng: number;
  /** Set for curated rows. */
  city: string | null;
  countryCode: string | null;
}

/**
 * Resolves attraction ids against `attractions` AND `curated_attractions` —
 * the public API emits both id spaces. An id may exist in both tables, so a
 * list of candidates is kept per id and the one matching the trip
 * destination wins during validation/enrichment.
 */
async function resolveAttractions(
  attractions: AttractionRepository,
  ids: number[],
): Promise<Map<number, ResolvedAttraction[]>> {
  const map = new Map<number, ResolvedAttraction[]>();
  if (ids.length === 0) return map;
  const [cached, curated] = await Promise.all([
    attractions.findByIds(ids),
    attractions.findCuratedByIds(ids),
  ]);
  const add = (id: number, r: ResolvedAttraction) => {
    const list = map.get(id);
    if (list) list.push(r);
    else map.set(id, [r]);
  };
  for (const a of cached) {
    add(a.id, {
      details: {
        id: a.id,
        name: a.name,
        originalName: a.originalName,
        category: a.category,
        distanceM: a.distanceM,
        rate: a.rate,
        source: a.source,
      },
      destinationId: a.destinationId,
      lat: a.lat,
      lng: a.lng,
      city: null,
      countryCode: null,
    });
  }
  for (const c of curated) {
    add(c.id, {
      details: {
        id: c.id,
        name: c.name,
        originalName: c.originalName,
        category: c.category,
        distanceM: null,
        rate: null,
        source: 'curated',
      },
      destinationId: null,
      lat: c.lat,
      lng: c.lng,
      city: c.city,
      countryCode: c.countryCode,
    });
  }
  return map;
}

function belongsToDestination(r: ResolvedAttraction, dest: DestinationRecord): boolean {
  if (r.destinationId !== null) return r.destinationId === dest.id;
  const cityMatch =
    r.city !== null &&
    r.city.toLowerCase() === dest.name.toLowerCase() &&
    r.countryCode === dest.countryCode;
  if (cityMatch) return true;
  if (dest.lat === null || dest.lng === null) return false;
  return haversineM(dest.lat, dest.lng, r.lat, r.lng) <= CURATED_ITINERARY_RADIUS_M;
}

/**
 * API mapping. Emergency contact + insurance are sensitive — they are only
 * returned to the trip owner, never to viewers of a public trip. Itinerary
 * stops are returned un-enriched here; trip detail/create/update responses
 * re-map them with resolved attraction details.
 */
function toTripResult(record: TripRecord, isOwner: boolean): TripResult {
  return {
    id: record.id,
    destinationId: record.destinationId,
    startDate: record.startDate,
    endDate: record.endDate,
    tripType: record.tripType,
    interests: record.interests,
    notes: record.notes,
    accommodation: record.accommodation,
    dietaryPreferences: record.dietaryPreferences,
    emergencyContact:
      isOwner && record.emergencyContactName && record.emergencyContactPhone
        ? { name: record.emergencyContactName, phone: record.emergencyContactPhone }
        : null,
    insurance:
      isOwner && record.insuranceProvider && record.insuranceNumber
        ? { provider: record.insuranceProvider, insuranceNumber: record.insuranceNumber }
        : null,
    budget:
      record.budgetAmount !== null && record.budgetCurrency
        ? { amount: record.budgetAmount, currency: record.budgetCurrency }
        : null,
    visibility: record.visibility,
    status: record.status,
    planMode: record.planMode,
    itinerary:
      record.itinerary === null
        ? null
        : record.itinerary.map((day) => ({
            day: day.day,
            stops: day.stops.map((stop) => ({ ...stop, attraction: null })),
          })),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function createTripService(deps: TripServiceDeps) {
  const { trips, destinations, attractions } = deps;

  async function requireDestination(
    destinationId: number | undefined,
  ): Promise<DestinationRecord | null> {
    if (destinationId === undefined) return null;
    const dest = await destinations.findById(destinationId);
    if (!dest) throw AppError.badRequest('Destination not found');
    return dest;
  }

  /**
   * Validates a full itinerary before saving: day numbers within the trip
   * length, every attractionId resolvable, and every attraction belonging to
   * the trip's destination (cached rows by destination_id; curated rows by
   * the same city-or-radius rule the attractions endpoint uses).
   */
  async function assertItineraryValid(
    itinerary: ItineraryDayInput[],
    startDate: string,
    endDate: string,
    dest: DestinationRecord | null,
  ): Promise<void> {
    const totalDays = Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS) + 1;
    for (const day of itinerary) {
      if (day.day > totalDays) {
        throw AppError.badRequest(
          `itinerary day ${day.day} exceeds the ${totalDays}-day trip (day must be between 1 and ${totalDays})`,
        );
      }
    }

    const ids = [...new Set(itinerary.flatMap((d) => d.stops.map((s) => s.attractionId)))];
    if (ids.length === 0) return;
    const resolved = await resolveAttractions(attractions, ids);
    const missing = ids.filter((id) => !resolved.has(id));
    if (missing.length > 0) {
      throw AppError.badRequest(`Unknown attractionId(s): ${missing.join(', ')}`);
    }
    if (!dest) return;
    const foreign = ids.filter(
      (id) => !resolved.get(id)!.some((r) => belongsToDestination(r, dest)),
    );
    if (foreign.length > 0) {
      throw AppError.badRequest(
        `attractionId(s) ${foreign.join(', ')} do not belong to this trip's destination`,
      );
    }
  }

  /** Attaches attraction details to each stored stop for API responses. */
  async function enrichItinerary(
    itinerary: ItineraryDayInput[] | null,
    dest: DestinationRecord | null,
  ): Promise<ItineraryDay[] | null> {
    if (itinerary === null) return null;
    const ids = [...new Set(itinerary.flatMap((d) => d.stops.map((s) => s.attractionId)))];
    const resolved = await resolveAttractions(attractions, ids);
    return itinerary.map((day) => ({
      day: day.day,
      stops: day.stops.map((stop) => {
        const candidates = resolved.get(stop.attractionId) ?? [];
        const best =
          (dest && candidates.find((r) => belongsToDestination(r, dest))) ?? candidates[0];
        let details = best?.details ?? null;
        if (details && best && best.destinationId === null && dest?.lat != null && dest.lng != null) {
          // Curated rows carry no stored distance — compute it like destination.service does.
          details = { ...details, distanceM: haversineM(dest.lat, dest.lng, best.lat, best.lng) };
        }
        return { ...stop, attraction: details };
      }),
    }));
  }

  /** Load a trip that exists AND the requester may see — 404 either way. */
  async function requireVisibleTrip(id: number, requesterId: number): Promise<TripRecord> {
    const trip = await trips.findById(id);
    if (!trip) throw AppError.notFound('Trip not found');
    if (trip.userId !== requesterId && trip.visibility !== 'public') {
      throw AppError.notFound('Trip not found');
    }
    return trip;
  }

  async function requireOwnedTrip(id: number, requesterId: number): Promise<TripRecord> {
    const trip = await trips.findById(id);
    if (!trip || trip.userId !== requesterId) throw AppError.notFound('Trip not found');
    return trip;
  }

  async function loadDestination(id: number | null): Promise<DestinationRecord | null> {
    return id === null ? null : destinations.findById(id);
  }

  return {
    async create(userId: number, input: CreateTripInput): Promise<TripResult> {
      const dest = await requireDestination(input.destinationId);
      if (input.itinerary) {
        await assertItineraryValid(input.itinerary, input.startDate, input.endDate, dest);
      }
      const record = await trips.create(userId, input);
      const result = toTripResult(record, true);
      result.itinerary = await enrichItinerary(record.itinerary, dest);
      return result;
    },

    async list(userId: number): Promise<TripResult[]> {
      const records = await trips.listByUser(userId);
      return records.map((r) => toTripResult(r, true));
    },

    async getById(id: number, requesterId: number): Promise<TripResult> {
      const trip = await requireVisibleTrip(id, requesterId);
      const result = toTripResult(trip, trip.userId === requesterId);
      const dest = await loadDestination(trip.destinationId);
      result.destination = dest
        ? { id: dest.id, name: dest.name, admin1: dest.admin1, countryCode: dest.countryCode }
        : null;
      result.itinerary = await enrichItinerary(trip.itinerary, dest);
      return result;
    },

    async update(id: number, requesterId: number, input: UpdateTripInput): Promise<TripResult> {
      const trip = await requireOwnedTrip(id, requesterId);
      const dest = await requireDestination(input.destinationId);
      // Cross-field check when only one date is patched.
      const start = input.startDate ?? trip.startDate;
      const end = input.endDate ?? trip.endDate;
      if (end < start) throw AppError.badRequest('endDate must be on or after startDate');
      if (input.itinerary !== undefined) {
        const effectiveDest =
          dest ?? (input.destinationId === undefined ? await loadDestination(trip.destinationId) : null);
        await assertItineraryValid(input.itinerary, start, end, effectiveDest);
      }
      const updated = await trips.update(id, input);
      if (!updated) throw AppError.notFound('Trip not found');
      const result = toTripResult(updated, true);
      result.itinerary = await enrichItinerary(updated.itinerary, dest ?? (await loadDestination(updated.destinationId)));
      return result;
    },

    async delete(id: number, requesterId: number): Promise<void> {
      await requireOwnedTrip(id, requesterId);
      await trips.delete(id);
    },
  };
}

export type TripService = ReturnType<typeof createTripService>;

export const tripService = createTripService({
  trips: tripRepository,
  destinations: destinationRepository,
  attractions: attractionRepository,
});
