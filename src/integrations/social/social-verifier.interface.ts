import type { SocialProfile } from '../../entities/auth.types.js';

/**
 * Verifies a provider-issued identity token server-side and returns the
 * normalized profile. Implementations must throw AppError for invalid,
 * expired or wrongly-audience'd tokens — the service never trusts claims
 * sent as plain body fields (the old PHP got this via hybridauth; here it
 * is explicit).
 */
export interface SocialTokenVerifier {
  verify(provider: string, idToken: string): Promise<SocialProfile>;
}
