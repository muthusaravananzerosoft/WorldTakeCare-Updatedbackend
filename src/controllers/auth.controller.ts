import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import type { RegistrableRole } from '../common/constants/auth.constants.js';
import { AppError } from '../common/errors/app-error.js';
import { sendSuccess } from '../common/responses/api-response.js';
import { getCookie } from '../common/utils/cookies.js';
import { env } from '../config/env.config.js';
import type {
  LoginInput,
  OAuthProviderName,
  RegisterInput,
  SocialLoginInput,
} from '../entities/auth.types.js';
import { authService } from '../services/auth.service.js';

const body = <T>(res: Response) => res.locals.validated.body as T;
const query = <T>(res: Response) => res.locals.validated.query as T;
const params = <T>(res: Response) => res.locals.validated.params as T;

/** Signed 10-minute JWT binding the callback to this browser (nonce + role + PKCE). */
const OAUTH_STATE_COOKIE = 'wt_oauth';

function oauthFrontendUrl(): string {
  return env.OAUTH_FRONTEND_REDIRECT ?? `${env.WEB_APP_URL}/login`;
}

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(body<RegisterInput>(res), req.ip);
    sendSuccess(req, res, result, HTTP_STATUS.CREATED);
  },

  async activate(req: Request, res: Response) {
    sendSuccess(req, res, await authService.activate(query<{ token: string }>(res).token));
  },

  async resendActivation(req: Request, res: Response) {
    sendSuccess(req, res, await authService.resendActivation(body<{ email: string }>(res).email));
  },

  async login(req: Request, res: Response) {
    sendSuccess(req, res, await authService.login(body<LoginInput>(res)));
  },

  async socialLogin(req: Request, res: Response) {
    sendSuccess(req, res, await authService.socialLogin(body<SocialLoginInput>(res), req.ip));
  },

  /**
   * GET /auth/oauth/:provider/start — sets the signed state cookie and 302s
   * to the provider consent screen. The browser is the caller, so responses
   * here are redirects, not JSON.
   */
  async oauthStart(req: Request, res: Response) {
    const { provider } = params<{ provider: OAuthProviderName }>(res);
    const { role } = query<{ role: RegistrableRole }>(res);
    const { url, cookie } = await authService.oauthStart(provider, role);
    const isProd = env.NODE_ENV === 'production';
    res.cookie(OAUTH_STATE_COOKIE, cookie, {
      httpOnly: true,
      // 'none' lets Apple's cross-site form_post carry the cookie back (Lax
      // blocks it in every browser); Secure is mandatory when SameSite=None.
      // Dev stays Lax/non-secure so http://localhost testing still works.
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      maxAge: 10 * 60 * 1000,
      path: '/',
    });
    res.redirect(url);
  },

  /**
   * GET/POST /auth/oauth/:provider/callback — Apple POSTs (form_post), the
   * others GET. Success/failure both 302 back to the frontend: tokens ride in
   * the URL hash; failures carry an error code the login page can surface.
   */
  async oauthCallback(req: Request, res: Response) {
    const { provider } = params<{ provider: OAuthProviderName }>(res);
    const data = (
      req.method === 'POST'
        ? body<{ code?: string; state?: string; user?: string; error?: string }>(res)
        : query<{ code?: string; state?: string; error?: string }>(res)
    ) as { code?: string; state?: string; user?: string; error?: string };
    const frontend = oauthFrontendUrl();
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
    try {
      const result = await authService.oauthCallback(
        provider,
        {
          code: data.code,
          state: data.state,
          cookie: getCookie(req, OAUTH_STATE_COOKIE),
          userJson: data.user,
          error: data.error,
        },
        req.ip,
      );
      res.redirect(
        `${frontend}#accessToken=${result.tokens.accessToken}&refreshToken=${result.tokens.refreshToken}`,
      );
    } catch (err) {
      const code = err instanceof AppError ? err.code.toLowerCase() : 'oauth_failed';
      res.redirect(`${frontend}#error=${code}`);
    }
  },

  async refresh(req: Request, res: Response) {
    sendSuccess(
      req,
      res,
      await authService.refresh(body<{ refreshToken: string }>(res).refreshToken),
    );
  },

  async logout(req: Request, res: Response) {
    sendSuccess(
      req,
      res,
      await authService.logout(body<{ refreshToken: string }>(res).refreshToken),
    );
  },

  async forgotPassword(req: Request, res: Response) {
    sendSuccess(req, res, await authService.forgotPassword(body<{ email: string }>(res).email));
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = body<{ token: string; password: string }>(res);
    sendSuccess(req, res, await authService.resetPassword(token, password));
  },

  async changePassword(req: Request, res: Response) {
    const { email, currentPassword, newPassword } = body<{
      email: string;
      currentPassword: string;
      newPassword: string;
    }>(res);
    sendSuccess(
      req,
      res,
      await authService.changePassword(req.user!.id, email, currentPassword, newPassword),
    );
  },

  async me(req: Request, res: Response) {
    // req.user is guaranteed by requireAuth
    sendSuccess(req, res, { user: await authService.getMe(req.user!.id) });
  },

  info(req: Request, res: Response) {
    sendSuccess(req, res, {
      service: 'auth',
      endpoints: [
        'POST /register',
        'GET /activate',
        'POST /resend-activation',
        'POST /login',
        'POST /social',
        'GET /oauth/:provider/start',
        'GET|POST /oauth/:provider/callback',
        'POST /refresh',
        'POST /logout',
        'POST /forgot-password',
        'POST /reset-password',
        'POST /change-password',
        'GET /me',
      ],
    });
  },
};
