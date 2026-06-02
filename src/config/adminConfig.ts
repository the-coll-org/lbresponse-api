// Configuration for the server-rendered admin dashboard (/admin).

// Comma-separated allowlist of Google account emails permitted to administer
// the platform. Anyone signing in with a Google account NOT on this list is
// rejected, even with a valid token.
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export const SESSION_COOKIE = 'admin_session';

// Session cookies are Secure (HTTPS-only) by default in production. Set
// COOKIE_SECURE=false to allow plain-HTTP validation (e.g. the branch container
// reached directly on http://localhost:3200 before it is behind Caddy/TLS).
export const COOKIE_SECURE = process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE.toLowerCase() === 'true'
  : process.env.NODE_ENV === 'production';

// Session cookie lifetime. Firebase caps session cookies at 14 days.
export const SESSION_EXPIRES_MS = (() => {
  const hours = Number(process.env.ADMIN_SESSION_HOURS);
  const h = Number.isFinite(hours) && hours > 0 ? hours : 8;
  return h * 60 * 60 * 1000;
})();

// Public Firebase Web SDK config, used by the login page to run Google sign-in
// in the browser. These values are NOT secret (they ship to every client).
export const firebaseWebConfig = {
  apiKey: process.env.FIREBASE_WEB_API_KEY ?? '',
  authDomain: process.env.FIREBASE_WEB_AUTH_DOMAIN ?? '',
  projectId:
    process.env.FIREBASE_WEB_PROJECT_ID ??
    process.env.FIREBASE_PROJECT_ID ??
    '',
  appId: process.env.FIREBASE_WEB_APP_ID ?? '',
};

export function isAdminConfigured(): boolean {
  return (
    ADMIN_EMAILS.length > 0 &&
    Boolean(firebaseWebConfig.apiKey) &&
    Boolean(firebaseWebConfig.authDomain)
  );
}
