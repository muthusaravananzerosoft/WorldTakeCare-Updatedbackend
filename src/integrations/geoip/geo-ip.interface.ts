/**
 * IP → location lookup. Legacy used ipinfo.io to pre-select the visitor's
 * country in dropdowns. Best-effort only — never a security decision.
 */
export interface GeoIpResult {
  countryCode: string;
  region?: string;
  city?: string;
}

export interface GeoIpLookup {
  lookup(ip: string): Promise<GeoIpResult | null>;
}
