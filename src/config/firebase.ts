import admin from 'firebase-admin';
import path from 'path';

const credPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  path.resolve(process.cwd(), 'service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credPath),
    databaseURL: process.env.FIREBASE_DB_URL,
  });
}

export const db: admin.database.Database = admin.database();
