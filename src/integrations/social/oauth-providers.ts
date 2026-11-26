import { createHash } from 'node:crypto';
import { SignJWT, createRemoteJWKSet, importPKCS8, jwtVerify } from 'jose';
import { ERROR_CODES } from '../../common/constants/error-codes.constants.js';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.js';
import { AppError } from '../../common/errors/app-error.js';
import { env } from '../../config/env.config.js';
import type { OAuthProviderName, SocialProfile } from '../../entities/auth.types.js';

export interface OAuthStartParams {
  redirectUri: string;
  /** Opaque nonce stored in the signed state cookie. */
  state: string;
  /** PKCE S256 challenge — set only when `pkce` is true. */
  codeChallenge?: string | undefined;
}

export interface OAuthExchangeParams {
  code: string;
  redirectUri: string;
  /** PKCE verifier carried through the signed state cookie (X only). */
  codeVerifier?: string | undefined;
  /** Apple posts a `user` JSON blob on first consent — the only source of the name. */
  userJson?: unknown;
}

export interface OAuthProvider {
  /** Whether the authorize URL needs a PKCE code_challenge. */
  pkce: boolean;
  /** Builds the provider consent URL the browser is redirected to. */
  authorizeUrl(params: OAuthStartParams): string;
  /** Exchanges the callback code for tokens and resolves the normalized profile. */
  exchange(params: OAuthExchangeParams): Promise<SocialProfile>;
}

export type OAuthProviderRegistry = Record<OAuthProviderName, OAuthProvider>;

function notEnabled(name: string): AppError {
  return AppError.badRequest(`${name} sign-in is not enabled on this server`);
}

function exchangeFailed(provider: string, detail?: unknown): AppError {
  return new AppError(
    HTTP_STATUS.UNAUTHORIZED,
    ERROR_CODES.INVALID_CREDENTIALS,
    `${provider} sign-in failed`,
    detail,
  );
}

async function postForm(
  url: string,
  fields: Record<string, string>,
  provider: string,
  headers: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(fields),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw exchangeFailed(provider, data);
  return data;
}

/** S256 challenge used by the X PKCE flow. */
export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

// ---------------------------------------------------------------------------
// Microsoft — v2.0 auth-code flow against login.microsoftonline.com/common.
// ---------------------------------------------------------------------------

const MICROSOFT_SCOPE = 'openid profile email User.Read offline_access';
const MICROSOFT_AUTHORIZE = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_ME = 'https://graph.microsoft.com/v1.0/me';

function microsoftCreds(): { clientId: string; clientSecret: string } {
  const { MICROSOFT_CLIENT_ID: clientId, MICROSOFT_CLIENT_SECRET: clientSecret } = env;
  if (!clientId || !clientSecret) throw notEnabled('Microsoft');
  return { clientId, clientSecret };
}

const microsoft: OAuthProvider = {
  pkce: false,

  authorizeUrl({ redirectUri, state }) {
    const { clientId } = microsoftCreds();
    const q = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: MICROSOFT_SCOPE,
      response_mode: 'query',
      state,
    });
    return `${MICROSOFT_AUTHORIZE}?${q}`;
  },

  async exchange({ code, redirectUri }) {
    const { clientId, clientSecret } = microsoftCreds();
    const token = await postForm(
      MICROSOFT_TOKEN,
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
      'Microsoft',
    );
    const accessToken = token.access_token;
    if (typeof accessToken !== 'string' || !accessToken) throw exchangeFailed('Microsoft', token);

    const res = await fetch(MICROSOFT_ME, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const me = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || typeof me.id !== 'string') throw exchangeFailed('Microsoft', me);

    const email =
      typeof me.mail === 'string' && me.mail
        ? me.mail
        : typeof me.userPrincipalName === 'string'
          ? me.userPrincipalName
          : null;
    return {
      providerUserId: me.id,
      email,
      emailVerified: Boolean(email),
      firstName: typeof me.givenName === 'string' ? me.givenName : '',
      lastName: typeof me.surname === 'string' ? me.surname : '',
    };
  },
};

// ---------------------------------------------------------------------------
// Apple — auth-code flow; client_secret is a short-lived ES256 JWT signed with
// the .p8 key. Apple POSTs code/state/user via response_mode=form_post.
// ---------------------------------------------------------------------------

const APPLE_AUTHORIZE = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

function appleCreds(): { clientId: string; teamId: string; keyId: string; privateKey: string } {
  const {
    APPLE_CLIENT_ID: clientId,
    APPLE_TEAM_ID: teamId,
    APPLE_KEY_ID: keyId,
    APPLE_PRIVATE_KEY: privateKey,
  } = env;
  if (!clientId || !teamId || !keyId || !privateKey) throw notEnabled('Apple');
  return { clientId, teamId, keyId, privateKey };
}

async function appleClientSecret(creds: ReturnType<typeof appleCreds>): Promise<string> {
  // Env carries the .p8 contents with escaped newlines; normalize to PEM.
  const key = await importPKCS8(creds.privateKey.replace(/\\n/g, '\n'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: creds.keyId })
    .setIssuer(creds.teamId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setAudience('https://appleid.apple.com')
    .setSubject(creds.clientId)
    .sign(key);
}

function appleNameHint(userJson: unknown): { firstName: string; lastName: string } {
  if (typeof userJson !== 'string' || !userJson) return { firstName: '', lastName: '' };
  try {
    const parsed = JSON.parse(userJson) as { name?: { firstName?: string; lastName?: string } };
    return {
      firstName: parsed.name?.firstName ?? '',
      lastName: parsed.name?.lastName ?? '',
    };
  } catch {
    return { firstName: '', lastName: '' };
  }
}

const apple: OAuthProvider = {
  pkce: false,

  authorizeUrl({ redirectUri, state }) {
    const { clientId } = appleCreds();
    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'name email',
      response_mode: 'form_post',
      state,
    });
    return `${APPLE_AUTHORIZE}?${q}`;
  },

  async exchange({ code, redirectUri, userJson }) {
    const creds = appleCreds();
    const token = await postForm(
      APPLE_TOKEN,
      {
        client_id: creds.clientId,
        client_secret: await appleClientSecret(creds),
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      },
      'Apple',
    );
    const idToken = token.id_token;
    if (typeof idToken !== 'string' || !idToken) throw exchangeFailed('Apple', token);

    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, APPLE_JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: creds.clientId,
      }));
    } catch {
      throw exchangeFailed('Apple');
    }
    if (!payload.sub) throw exchangeFailed('Apple');

    const name = appleNameHint(userJson);
    return {
      providerUserId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      firstName: name.firstName,
      lastName: name.lastName,
    };
  },
};

// ---------------------------------------------------------------------------
// X (Twitter) — OAuth 2.0 authorization code + PKCE. Requires the app to be
// switched to OAuth 2.0 in the Twitter developer portal; the API key/secret
// from the legacy OAuth 1.0a config are reused as client credentials.
// ---------------------------------------------------------------------------

const TWITTER_AUTHORIZE = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_ME = 'https://api.twitter.com/2/users/me?user.fields=name,username,confirmed_email';
const TWITTER_SCOPE = 'tweet.read users.read users.email offline.access';

function twitterCreds(): { clientId: string; clientSecret: string } {
  const { TWITTER_CLIENT_ID: clientId, TWITTER_CLIENT_SECRET: clientSecret } = env;
  if (!clientId || !clientSecret) throw notEnabled('X');
  return { clientId, clientSecret };
}

const twitter: OAuthProvider = {
  pkce: true,

  authorizeUrl({ redirectUri, state, codeChallenge }) {
    const { clientId } = twitterCreds();
    if (!codeChallenge) throw notEnabled('X');
    const q = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: TWITTER_SCOPE,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${TWITTER_AUTHORIZE}?${q}`;
  },

  async exchange({ code, redirectUri, codeVerifier }) {
    const { clientId, clientSecret } = twitterCreds();
    if (!codeVerifier) throw exchangeFailed('X');
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const token = await postForm(
      TWITTER_TOKEN,
      {
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        client_id: clientId,
      },
      'X',
      { Authorization: `Basic ${basic}` },
    );
    const accessToken = token.access_token;
    if (typeof accessToken !== 'string' || !accessToken) throw exchangeFailed('X', token);

    const res = await fetch(TWITTER_ME, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const me = (await res.json().catch(() => ({}))) as {
      data?: Record<string, unknown>;
    };
    const data = me.data;
    if (!res.ok || !data || data.id === undefined) throw exchangeFailed('X', me);

    const name = typeof data.name === 'string' ? data.name : '';
    const [first = '', ...rest] = name.split(' ');
    const email =
      typeof data.confirmed_email === 'string'
        ? data.confirmed_email
        : typeof data.email === 'string'
          ? data.email
          : null;
    return {
      providerUserId: String(data.id),
      email,
      emailVerified: Boolean(email),
      firstName: first || (typeof data.username === 'string' ? data.username : ''),
      lastName: rest.join(' '),
    };
  },
};

export const oauthProviders: OAuthProviderRegistry = { microsoft, apple, twitter };
