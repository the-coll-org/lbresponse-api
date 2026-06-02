# Firebase Realtime Database migration runbook

How to move the Realtime Database from one Firebase project to another. All DB
access in this app goes through the Firebase Admin SDK with a service account,
and the public API is read-only, so this is a low-risk, near-zero-downtime
migration when sequenced correctly.

> ⚠️ Order matters: migrate **before** the admin dashboard starts taking live
> writes, or schedule a brief read-only window. Once admins create/edit data,
> the source and destination can drift.

## 1. Prepare the destination project

1. Create the new Firebase project (on the org/billing account that should own
   it long-term).
2. **Realtime Database → Create** — pick the region deliberately (it is
   permanent; match the source region, e.g. `europe-west1`).
3. **Rules** → lock down (the Admin SDK bypasses these, so deny-all is free
   hardening):
   ```json
   { "rules": { ".read": false, ".write": false } }
   ```
4. **Authentication → Google** → enable (needed by the admin dashboard). Add the
   dashboard's domain under **Settings → Authorized domains**.
5. **Project settings → Service accounts → Generate new private key** → save the
   JSON somewhere safe (do NOT commit it).
6. **Project settings → Your apps → Web** → copy the `firebaseConfig` (public).

## 2. Migrate the data

Use the bundled script. It exports the source root, writes a JSON backup to
disk, refuses to overwrite a non-empty destination, and verifies top-level
counts after the copy.

Dry run first (export + verify, no writes):

```bash
MIG_OLD_SA=./service-account.json \
MIG_OLD_URL=https://SOURCE-default-rtdb.<region>.firebasedatabase.app \
MIG_NEW_SA=./service-account.new.json \
MIG_NEW_URL=https://DEST-default-rtdb.<region>.firebasedatabase.app \
MIG_BACKUP=./backup-source.json \
node scripts/migrate-firebase.mjs
```

Then apply (add `MIG_APPLY=true`):

```bash
MIG_OLD_SA=./service-account.json \
MIG_OLD_URL=https://SOURCE-default-rtdb.<region>.firebasedatabase.app \
MIG_NEW_SA=./service-account.new.json \
MIG_NEW_URL=https://DEST-default-rtdb.<region>.firebasedatabase.app \
MIG_BACKUP=./backup-source.json MIG_APPLY=true \
node scripts/migrate-firebase.mjs
```

## 3. Validate on the branch container (before cutover)

Run the new code against the new instance on port 3200, alongside the live
`main` container (3100), and confirm the data is identical:

```bash
cp /path/to/new-service-account.json ./service-account.new.json
# create .env.branch (see .env.example for the keys), then:
HOST_PORT=3200 docker compose -p lbresponse-branch \
  -f docker-compose.yml -f docker-compose.branch.yml up -d --build

# Compare old vs new — payloads should be byte-identical:
for ep in "api/organizations?limit=500" "api/hotlines?limit=500" "api/filters"; do
  diff <(curl -s "http://127.0.0.1:3100/$ep") <(curl -s "http://127.0.0.1:3200/$ep") \
    && echo "$ep OK" || echo "$ep DIFFERS"
done
```

## 4. Cut over

1. Point production at the new instance: update `FIREBASE_DB_URL` in `.env` and
   replace the mounted `service-account.json` with the new project's key.
2. `docker compose up -d` and confirm `/health` + a couple of GET endpoints.
3. **Keep the old instance live and untouched for ~1 week** as instant rollback
   (revert `.env` + service-account, redeploy). Decommission only after you are
   confident.

## 5. Tear down the branch validation stack

```bash
docker compose -p lbresponse-branch -f docker-compose.yml -f docker-compose.branch.yml down
```

## Files (all gitignored)

- `service-account.new.json` — destination service-account key
- `.env.branch` — branch container overrides
- `backup-*.json` — on-disk export of the source DB
