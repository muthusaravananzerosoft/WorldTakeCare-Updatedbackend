import { OAuth2Client } from 'google-auth-library';
import { ERROR_CODES } from '../../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/errors/app-error.js';
import { env } from '../../config/env.config.js';
import type { SocialProfile } from '../../entities/auth.types.js';
import type { SocialTokenVerifier } from './social-verifier.interface.js';

const client = new OAuth2Client();

function invalidToken(): AppError {
  return new AppError(
    HTTP_STATUS.UNAUTHORIZED,
    ERROR_CODES.INVALID_CREDENTIALS,
    'Invalid Google sign-in token',
  );
}

/**
 * Google id_token verification — signature, audience (our client id) and
 * expiry are all checked by the OAuth2Client. Any failure means the token
 * is treated as invalid credentials; no claim is trusted unverified.
 */
export const googleVerifier: SocialTokenVerifier = {
  async verify(provider, idToken): Promise<SocialProfile> {
    if (provider !== 'google') {
      throw AppError.badRequest(`Unsupported provider: ${provider}`);
    }
    if (!env.GOOGLE_CLIENT_ID) {
      throw AppError.badRequest('Google sign-in is not enabled on this server');
    }
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw invalidToken();
    }
    if (!payload?.sub || !payload.email) throw invalidToken();
    return {
      providerUserId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      firstName: payload.given_name ?? '',
      lastName: payload.family_name ?? '',
    };
  },
};
