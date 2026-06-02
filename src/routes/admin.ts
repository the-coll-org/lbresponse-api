import { Router, Request, Response } from 'express';
import { getAuth } from '../config/firebase';
import {
  COOKIE_SECURE,
  firebaseWebConfig,
  isAdminConfigured,
  isAdminEmail,
  SESSION_COOKIE,
  SESSION_EXPIRES_MS,
} from '../config/adminConfig';
import { requireAdmin, AdminRequest } from '../middleware/adminAuth';
import { adminAuthLimiter } from '../middleware/rateLimit';
import { createOrganizationRecord } from '../controllers/organizationsController';
import { getSnapshot } from '../utils/entityStore';
import { HttpError } from '../middleware/error';
import { logger } from '../lib/logger';

const router = Router();

// --- Public auth routes -----------------------------------------------------

// Login page: runs Google sign-in in the browser via the Firebase Web SDK.
router.get('/login', (_req: Request, res: Response) => {
  if (!isAdminConfigured()) {
    res.status(503).render('error', {
      title: 'Admin not configured',
      message:
        'The admin dashboard is not configured. Set ADMIN_EMAILS and FIREBASE_WEB_* environment variables.',
    });
    return;
  }
  res.render('login', { firebaseConfig: firebaseWebConfig });
});

// Exchange a freshly-minted Google ID token for an httpOnly session cookie.
router.post(
  '/session',
  adminAuthLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const idToken = ((req.body ?? {}) as { idToken?: string }).idToken;
    if (!idToken) {
      res.status(400).json({ error: 'Missing idToken' });
      return;
    }
    try {
      const decoded = await getAuth().verifyIdToken(idToken, true);
      if (!decoded.email_verified || !isAdminEmail(decoded.email)) {
        logger.warn({ email: decoded.email }, 'Rejected admin login attempt');
        res.status(403).json({ error: 'This account is not authorized.' });
        return;
      }
      const sessionCookie = await getAuth().createSessionCookie(idToken, {
        expiresIn: SESSION_EXPIRES_MS,
      });
      res.cookie(SESSION_COOKIE, sessionCookie, {
        httpOnly: true,
        secure: COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: SESSION_EXPIRES_MS,
        path: '/',
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      logger.warn({ err }, 'Admin session creation failed');
      res.status(401).json({ error: 'Invalid or expired token.' });
    }
  }
);

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(200).json({ ok: true });
});

// --- Authenticated routes ---------------------------------------------------

router.use(requireAdmin);

// Dashboard: list organizations (providers) so admins can review the data set.
router.get('/', async (req: AdminRequest, res: Response): Promise<void> => {
  const snapshot = await getSnapshot();
  const organizations = snapshot.providers
    .map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      nameAr: p.provider_name_ar ?? '',
      sectors: Array.isArray(p.sectors) ? p.sectors.join(', ') : '',
      districts: Array.isArray(p.districts) ? p.districts.join(', ') : '',
      verified: Boolean(p.verified),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.render('orgs-list', {
    email: req.admin?.email ?? '',
    organizations,
    created: req.query.created === '1',
  });
});

// New-organization form.
router.get('/orgs/new', (req: AdminRequest, res: Response) => {
  res.render('org-form', {
    email: req.admin?.email ?? '',
    error: null,
    values: {},
  });
});

// Create an organization, then redirect back to the list.
router.post(
  '/orgs',
  async (req: AdminRequest, res: Response): Promise<void> => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    try {
      const record = await createOrganizationRecord(body);
      logger.info(
        {
          by: req.admin?.email,
          id: record.provider_id,
          name: record.provider_name,
        },
        'Organization created via admin dashboard'
      );
      res.redirect('/admin?created=1');
    } catch (err) {
      const message =
        err instanceof HttpError
          ? err.message
          : 'Failed to create organization.';
      res
        .status(err instanceof HttpError ? err.status : 500)
        .render('org-form', {
          email: req.admin?.email ?? '',
          error: message,
          values: body,
        });
    }
  }
);

export default router;
