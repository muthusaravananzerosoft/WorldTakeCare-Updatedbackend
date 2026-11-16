import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../common/constants/http-status.constants.js';
import { sendSuccess } from '../common/responses/api-response.js';
import type { LoginInput, RegisterInput } from '../entities/auth.types.js';
import { authService } from '../services/auth.service.js';

const body = <T>(res: Response) => res.locals.validated.body as T;
const query = <T>(res: Response) => res.locals.validated.query as T;

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
        'POST /refresh',
        'POST /logout',
        'POST /forgot-password',
        'POST /reset-password',
        'GET /me',
      ],
    });
  },
};
