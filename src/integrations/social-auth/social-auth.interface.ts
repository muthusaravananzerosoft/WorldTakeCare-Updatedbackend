/**
 * Social sign-in providers confirmed in the legacy source: Google + Twitter
 * (Hybridauth v2), Microsoft + Apple (Hybridauth v3), Facebook (PHP SDK).
 */
export const SOCIAL_PROVIDERS = ['google', 'facebook', 'twitter', 'microsoft', 'apple'] as const;

export type SocialProviderName = (typeof SOCIAL_PROVIDERS)[number];

/** Normalised profile returned by every provider. */
export interface SocialProfile {
  provider: SocialProviderName;
  /** Provider-issued user id (sub/uid) — verified server-side. */
  providerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

/**
 * Exchanges an OAuth authorization code for a verified profile. Identity must
 * come from the provider token exchange only — never from request fields (the
 * legacy app set the session from a `use_id` request parameter; see bug B-06).
 */
export interface SocialAuthProvider {
  readonly provider: SocialProviderName;
  exchange(code: string, redirectUri: string): Promise<SocialProfile>;
}
