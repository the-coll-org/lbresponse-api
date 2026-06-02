import rateLimit from 'express-rate-limit';

// Rate limiting is disabled under test so the e2e/api suites can hammer the
// app without tripping limits.
const enabled = process.env.NODE_ENV !== 'test';

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// General limiter applied to every request. Generous by default — it exists to
// blunt abuse / runaway clients (and the Firebase read costs they'd cause), not
// to throttle normal traffic.
export const apiLimiter = rateLimit({
  windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  limit: num(process.env.RATE_LIMIT_MAX, 300),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !enabled,
  message: { error: 'Too many requests, please try again later.' },
});

// Stricter limiter for the unauthenticated client-error ingest sink so it can't
// be flooded to pollute logs / fill disk.
export const clientErrorLimiter = rateLimit({
  windowMs: num(process.env.CLIENT_ERROR_RATE_LIMIT_WINDOW_MS, 60_000),
  limit: num(process.env.CLIENT_ERROR_RATE_LIMIT_MAX, 30),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !enabled,
  message: { error: 'Too many requests, please try again later.' },
});

// Strict limiter guarding the admin login / session-exchange routes against
// credential brute force.
export const adminAuthLimiter = rateLimit({
  windowMs: num(process.env.ADMIN_AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60_000),
  limit: num(process.env.ADMIN_AUTH_RATE_LIMIT_MAX, 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => !enabled,
  message: { error: 'Too many attempts, please try again later.' },
});
