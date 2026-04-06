import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

function parseCredJson(raw: string): admin.ServiceAccount {
  let cleaned = raw.trim();

  // Strip surrounding quotes if platform double-quoted the value
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Render converts \n in env vars to actual newlines — escape them back
  // so JSON.parse doesn't choke on raw control chars in string values
  cleaned = cleaned.replace(/\n/g, '\\n');

  let parsed: unknown = JSON.parse(cleaned);

  // Handle double-encoded JSON
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj.project_id || typeof obj.project_id !== 'string') {
    console.error(
      'FIREBASE_CRED_JSON parsed but missing project_id. Keys:',
      Object.keys(obj)
    );
    throw new Error('FIREBASE_CRED_JSON is invalid — missing project_id.');
  }

  return obj as admin.ServiceAccount;
}

function initFirebase(): admin.database.Database {
  if (admin.apps.length) {
    return admin.database();
  }

  if (process.env.FIREBASE_CRED_JSON) {
    const serviceAccount = parseCredJson(process.env.FIREBASE_CRED_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
    return admin.database();
  }

  const credPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(process.cwd(), 'service-account.json');

  if (fs.existsSync(credPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(credPath),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
    return admin.database();
  }

  throw new Error(
    'Firebase credentials not found. Set FIREBASE_CRED_JSON or GOOGLE_APPLICATION_CREDENTIALS.'
  );
}

let _db: admin.database.Database | null = null;

export function getDb(): admin.database.Database {
  if (!_db) {
    _db = initFirebase();
  }
  return _db;
}
