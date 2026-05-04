import { Router, Request, Response } from 'express';
import { logger } from '../lib/logger';

const router = Router();

interface ClientErrorBody {
  message?: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  type?: string;
  userAgent?: string;
  release?: string;
}

const MAX_FIELD_BYTES = 8 * 1024;

function clamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > MAX_FIELD_BYTES
    ? value.slice(0, MAX_FIELD_BYTES)
    : value;
}

router.post('/', (req: Request, res: Response): void => {
  const body = (req.body ?? {}) as ClientErrorBody;
  const log = (req as Request & { log?: typeof logger }).log ?? logger;

  log.warn(
    {
      kind: 'client-error',
      error: {
        type: clamp(body.type),
        message: clamp(body.message),
        stack: clamp(body.stack),
      },
      context: {
        url: clamp(body.url),
        line: body.line,
        column: body.column,
        userAgent:
          clamp(body.userAgent) ?? clamp(req.headers['user-agent']?.toString()),
        release: clamp(body.release),
      },
    },
    'Client-side error reported'
  );

  res.status(204).end();
});

export default router;
