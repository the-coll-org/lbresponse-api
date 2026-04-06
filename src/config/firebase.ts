import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

function parseCredJson(raw: string): admin.ServiceAccount {
  // Strip surrounding quotes if Render double-quoted the value
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith('"') && cleaned.endsWith('"'))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  // Replace literal \n with actual newlines (Render can escape them)
  cleaned = cleaned.replace(/\\n/g, '\n');

  let parsed: unknown = JSON.parse(cleaned);

  // Handle double-encoded JSON (string inside string)
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const obj = parsed as Record<string, unknown>;
  if (!obj.project_id || typeof obj.project_id !== 'string') {
    console.error(
      'FIREBASE_CRED_JSON parsed but missing project_id. Keys:',
      Object.keys(obj),
      'Types:',
      Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v]))
    );
    throw new Error('FIREBASE_CRED_JSON is invalid — missing project_id.');
  }

  return obj as admin.ServiceAccount;
}

function initFirebase(): admin.database.Database {
  if (admin.apps.length) {
    return admin.database();
  }

  // Option 1: JSON string in env var
  if (process.env.FIREBASE_CRED_JSON) {
    const serviceAccount = parseCredJson(process.env.FIREBASE_CRED_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DB_URL,
    });
    return admin.database();
  }

  // Option 2: File path
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

// Lazy init — don't crash at import time
let _db: admin.database.Database | null = null;

export function getDb(): admin.database.Database {
  if (!_db) {
    _db = initFirebase();
  }
  return _db;
}
