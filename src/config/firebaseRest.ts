import https from 'https';
import admin from 'firebase-admin';
import { getDb } from './firebase';

export async function firebaseShallowGet(
  path: string
): Promise<Record<string, boolean> | null> {
  // Ensure Firebase is initialized
  getDb();
  const app = admin.app();
  const tokenResult = await app.options.credential?.getAccessToken();
  const token = tokenResult?.access_token;
  const dbUrl = process.env.FIREBASE_DB_URL ?? '';
  const url = `${dbUrl}/${path}.json?shallow=true`;

  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: string) => (body += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body) as Record<string, boolean> | null);
          } catch {
            reject(
              new Error(`Invalid JSON from Firebase: ${body.slice(0, 200)}`)
            );
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Firebase REST request timed out'));
    });
  });
}
