import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

function getCredential(): admin.credential.Credential {
  // Option 1: JSON string in env var (for Render / cloud deploys)
  if (process.env.FIREBASE_CRED_JSON) {
    const parsed = JSON.parse(
      process.env.FIREBASE_CRED_JSON
    ) as admin.ServiceAccount;
    return admin.credential.cert(parsed);
  }

  // Option 2: File path
  const credPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(process.cwd(), 'service-account.json');

  if (fs.existsSync(credPath)) {
    return admin.credential.cert(credPath);
  }

  throw new Error(
    'Firebase credentials not found. Set FIREBASE_CRED_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: getCredential(),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

export const db: admin.database.Database = admin.database();
