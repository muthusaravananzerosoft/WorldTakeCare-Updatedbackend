/** My Trips domain types. */

export type TripVisibility = 'public' | 'private' | 'friends';
export type TripStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';
export type TripPlanMode = 'auto' | 'manual';

/** One planned stop as sent by the client / stored in the DB. */
export interface ItineraryStopInput {
  /** Stable PK from the Destination Attractions API (attractions.att_id or curated_attractions.cur_id). */
  attractionId: number;
  order: number;
  /** Optional HH:mm visit time. */
  time?: string;
  note?: string;
}

/** One day of the stored plan; `stops` may be empty. */
export interface ItineraryDayInput {
  /** 1-based day number — must not exceed the trip length. */
  day: number;
  stops: ItineraryStopInput[];
}

/** A stop enriched with attraction details for API responses. */
export interface ItineraryStop extends ItineraryStopInput {
  attraction: {
    id: number;
    name: string;
    originalName: string | null;
    category: string | null;
    distanceM: number | null;
    rate: number | null;
    source: string;
  } | null;
}

/** Response day — same as stored plus resolved attraction details. */
export interface ItineraryDay {
  day: number;
  stops: ItineraryStop[];
}

/** Full trip row + child values as stored in/loaded from the DB. */
export interface TripRecord {
  id: number;
  userId: number;
  destinationId: number | null;
  startDate: string;
  endDate: string;
  tripType: string | null;
  interests: string[];
  notes: string | null;
  accommodation: string | null;
  dietaryPreferences: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  budgetAmount: number | null;
  budgetCurrency: string | null;
  visibility: TripVisibility;
  status: TripStatus;
  /** 'manual' = user-built plan; 'auto' = generated roadmap. */
  planMode: TripPlanMode;
  /** Stored day-wise plan (raw stops, no attraction enrichment), or null. */
  itinerary: ItineraryDayInput[] | null;
  createdAt: string;
  updatedAt: string;
}

/** Fields the client sends (already validated). */
export interface CreateTripInput {
  destinationId: number;
  startDate: string;
  endDate: string;
  tripType?: string;
  interests: string[];
  notes?: string;
  accommodation?: string;
  dietaryPreferences: string[];
  emergencyContact?: { name: string; phone: string };
  insurance?: { provider: string; insuranceNumber: string };
  budget?: { amount: number; currency: string };
  visibility: TripVisibility;
  planMode: TripPlanMode;
  /** Day-wise plan — replaces the whole itinerary when sent on PATCH. */
  itinerary?: ItineraryDayInput[];
}

/** PATCH body — every field optional; arrays replace when present. */
export type UpdateTripInput = Partial<CreateTripInput>;

/** API response shape — nested groups mirror the request JSON. */
export interface TripResult {
  id: number;
  destinationId: number | null;
  destination?: { id: number; name: string; admin1: string | null; countryCode: string | null } | null;
  startDate: string;
  endDate: string;
  tripType: string | null;
  interests: string[];
  notes: string | null;
  accommodation: string | null;
  dietaryPreferences: string[];
  emergencyContact: { name: string; phone: string } | null;
  insurance: { provider: string; insuranceNumber: string } | null;
  budget: { amount: number; currency: string } | null;
  visibility: TripVisibility;
  status: TripStatus;
  planMode: TripPlanMode;
  /** Day-wise plan with attraction details resolved on trip detail; raw stops elsewhere. */
  itinerary: ItineraryDay[] | null;
  createdAt: string;
  updatedAt: string;
}
