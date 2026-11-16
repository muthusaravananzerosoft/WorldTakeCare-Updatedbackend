/**
 * Geocoding/places (lead-specified Google Maps adapter). New capability — the
 * legacy app only had ipinfo + zip tables. Exact use-cases to be confirmed
 * (profile locations, tour/meeting points).
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodedPlace {
  formattedAddress: string;
  point: GeoPoint;
  placeId?: string;
}

export interface MapsProvider {
  geocode(address: string): Promise<GeocodedPlace | null>;
  reverseGeocode(point: GeoPoint): Promise<GeocodedPlace | null>;
}
