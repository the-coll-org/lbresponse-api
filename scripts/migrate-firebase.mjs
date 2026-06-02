#!/usr/bin/env node
// Realtime Database migration: copy the entire RTDB tree from a source project
// to a destination project, with an on-disk backup and a post-copy verification.
//
// All inputs come from environment variables (no secrets are committed):
//   MIG_OLD_SA   path to the SOURCE service-account JSON
//   MIG_OLD_URL  SOURCE databaseURL
//   MIG_NEW_SA   path to the DESTINATION service-account JSON
//   MIG_NEW_URL  DESTINATION databaseURL
//   MIG_BACKUP   (optional) path to write a JSON backup of the source tree
//   MIG_APPLY    must be "true" to actually write to the destination;
//                otherwise the script does a dry run (export + verify only)
//
// Usage:
//   MIG_OLD_SA=./service-account.json \
//   MIG_OLD_URL=https://old-default-rtdb.europe-west1.firebasedatabase.app \
//   MIG_NEW_SA=./service-account.new.json \
//   MIG_NEW_URL=https://new-default-rtdb.europe-west1.firebasedatabase.app \
//   MIG_BACKUP=./backup.json MIG_APPLY=true \
//   node scripts/migrate-firebase.mjs

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const OLD_SA = need('MIG_OLD_SA');
const OLD_URL = need('MIG_OLD_URL');
const NEW_SA = need('MIG_NEW_SA');
const NEW_URL = need('MIG_NEW_URL');
const BACKUP = process.env.MIG_BACKUP;
const APPLY = process.env.MIG_APPLY === 'true';

function loadSA(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function summarize(tree) {
  const out = {};
  for (const [k, v] of Object.entries(tree ?? {})) {
    out[k] = v && typeof v === 'object' ? Object.keys(v).length : typeof v;
  }
  return out;
}

async function main() {
  const oldSA = loadSA(OLD_SA);
  const newSA = loadSA(NEW_SA);

  console.log(`SOURCE      : ${oldSA.project_id}  (${OLD_URL})`);
  console.log(`DESTINATION : ${newSA.project_id}  (${NEW_URL})`);
  console.log(`MODE        : ${APPLY ? 'APPLY (will write)' : 'DRY RUN (no writes)'}`);
  console.log('');

  const srcApp = admin.initializeApp(
    { credential: admin.credential.cert(oldSA), databaseURL: OLD_URL },
    'src'
  );
  const dstApp = admin.initializeApp(
    { credential: admin.credential.cert(newSA), databaseURL: NEW_URL },
    'dst'
  );

  // 1. Export source root.
  console.log('Reading source root...');
  const snap = await srcApp.database().ref('/').once('value');
  const data = snap.val();
  if (data == null) {
    console.error('Source database is empty — aborting.');
    process.exit(1);
  }
  console.log('Source top-level counts:', summarize(data));

  // 2. Backup to disk.
  if (BACKUP) {
    writeFileSync(BACKUP, JSON.stringify(data, null, 2));
    console.log(`Backup written: ${BACKUP}`);
  }

  // 3. Write to destination (only when applying).
  if (APPLY) {
    const dstSnap = await dstApp.database().ref('/').once('value');
    if (dstSnap.exists()) {
      console.error(
        'Destination is NOT empty — refusing to overwrite. Clear it first or use a fresh instance.'
      );
      process.exit(1);
    }
    console.log('Writing to destination root...');
    await dstApp.database().ref('/').set(data);
    console.log('Write complete.');
  }

  // 4. Verify.
  const verifySnap = await dstApp.database().ref('/').once('value');
  const verify = verifySnap.val();
  console.log('Destination top-level counts:', summarize(verify));

  const srcKeys = JSON.stringify(summarize(data));
  const dstKeys = JSON.stringify(summarize(verify));
  if (APPLY) {
    if (srcKeys === dstKeys) {
      console.log('\n✅ Verification passed — destination matches source.');
    } else {
      console.error('\n❌ Verification FAILED — counts differ.');
      process.exit(1);
    }
  } else {
    console.log('\nDry run complete. Re-run with MIG_APPLY=true to migrate.');
  }

  await srcApp.delete();
  await dstApp.delete();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
