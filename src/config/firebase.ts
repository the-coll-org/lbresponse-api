import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

function getCredential(): admin.credential.Credential {
  // Option 1: Individual env vars (most reliable for cloud deploys)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    return admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  }

  // Option 2: File path (local dev)
  const credPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(process.cwd(), 'service-account.json');

  if (fs.existsSync(credPath)) {
    return admin.credential.cert(credPath);
  }

  throw new Error(
    'Firebase credentials not found. Set FIREBASE_PROJECT_ID + FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS.'
  );
}

function ensureApp(): void {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: getCredential(),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

export function getDb(): admin.database.Database {
  ensureApp();
  return admin.database();
}

export function getAuth(): admin.auth.Auth {
  ensureApp();
  return admin.auth();
}
