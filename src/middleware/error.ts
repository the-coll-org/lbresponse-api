import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Internal server error';
  if (status >= 500) {
    const log = (req as Request & { log?: typeof logger }).log ?? logger;
    log.error(
      {
        err,
        method: req.method,
        url: req.originalUrl,
      },
      'Unhandled error'
    );
  }
  // Never leak internal error details to clients on 5xx — log them above instead.
  const clientMessage = status >= 500 ? 'Internal server error' : message;
  res.status(status).json({ error: clientMessage });
}
