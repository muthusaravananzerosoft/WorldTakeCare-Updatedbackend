import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 5 already forwards rejected promises to the error middleware.
 * This wrapper keeps handler typing explicit and is safe to use everywhere.
 */
export function asyncHandler<Req extends Request = Request>(
  handler: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req as Req, res, next).catch(next);
  };
}
