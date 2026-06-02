import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../config/firebase';
import { isAdminEmail, SESSION_COOKIE } from '../config/adminConfig';
import { logger } from '../lib/logger';

export interface AdminRequest extends Request {
  admin?: { uid: string; email: string };
}

// Gate for all authenticated admin pages/actions. Verifies the Firebase session
// cookie (checking for revocation) and enforces the email allowlist. Browser
// requests that fail are redirected to the login page.
export async function requireAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const cookies = req.cookies as Record<string, string> | undefined;
  // eslint-disable-next-line security/detect-object-injection -- SESSION_COOKIE is a constant
  const cookie = cookies?.[SESSION_COOKIE];

  if (!cookie) {
    res.redirect('/admin/login');
    return;
  }

  try {
    const decoded = await getAuth().verifySessionCookie(cookie, true);
    if (!isAdminEmail(decoded.email)) {
      logger.warn(
        { email: decoded.email },
        'Admin access denied (not on allowlist)'
      );
      res.status(403).render('error', {
        title: 'Forbidden',
        message:
          'This Google account is not authorized to administer the platform.',
      });
      return;
    }
    req.admin = { uid: decoded.uid, email: decoded.email ?? '' };
    next();
  } catch {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.redirect('/admin/login');
  }
}
